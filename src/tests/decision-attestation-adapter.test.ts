import test from 'node:test';import assert from 'node:assert/strict';import crypto,{randomUUID} from 'node:crypto';
import net from 'node:net';import tls from 'node:tls';import http from 'node:http';import https from 'node:https';import dns from 'node:dns';import childProcess from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';
import {attestationPersistenceFixture} from './decision-attestation-fixture';
import {attestationDigest as digest} from '../modules/api-keys/decision-attestation-key-model';
import {attestationSourceVersion,inspectAttestationState,type AttestationModelState} from '../modules/api-keys/decision-attestation-persistence-model';
import {createDecisionAttestationAdapter,attestationMutationDigest,decisionAttestationGuards,decisionAttestationHelpers,
 type AttestationPersistencePorts,type AttestationMutationReceipt} from '../modules/api-keys/decision-attestation-adapter';
const copy=<T>(x:T):T=>structuredClone(x),hash=(s:string)=>s.repeat(64);
function fixture(noKey=false){const f=attestationPersistenceFixture('first_enrollment',false,false,noKey);let seed:1|null=1,readback='',ack='';
 const guards:any[]=decisionAttestationGuards.map(g=>({...g,enabled:true})),helpers:any[]=decisionAttestationHelpers.map(g=>({...g,enabled:true}));
 const committed=new Map<string,AttestationMutationReceipt>();let commits=0,reads=0;
 const ports:AttestationPersistencePorts={qualification:'synthetic_attestation_adapter_v1',bound:f.deps.bound,
  transaction:async(mode,work)=>{let pending:AttestationMutationReceipt|undefined,returned:unknown;
   const rollback=Error('false commit acknowledgement');try{return await f.deps.transaction(mode,async db=>{
    (db as any).$queryRaw=async(sql:TemplateStringsArray)=>{const q=sql.join('');if(q.includes('decision_attestation_available'))return [{decision_attestation_available:true}];
     if(q.includes('FROM pg_trigger'))return copy(guards);if(q.includes('FROM pg_proc'))return copy(helpers);throw Error('unexpected SQL');};
    (db as any).remember=(r:AttestationMutationReceipt)=>pending=r;
    returned=await work(db);if(pending&&ack==='false'){ack='';throw rollback;}return returned as any;
   });}catch(e){if(e===rollback)return returned as any;throw e;}finally{
    if(pending&&f.state().journal.some(j=>j.id===pending!.operationId)){committed.set(pending.operationId,pending);commits++;}
   }},
  projectCanonical:async(db,q)=>{assert.deepEqual(q,f.input());return {authorityRevisionSeed:seed,state:await f.deps.load(db)};},
  appendChildren:async(db,delta)=>{assert.ok(Object.isFrozen(delta));const s=inspectAttestationState(await f.deps.load(db),f.now());
   assert.deepEqual(delta.expected,attestationSourceVersion(s));assert.equal(delta.decisionId,f.b.decisionId);assert.equal(delta.ticketId,f.b.ticketId);
   // A transactional mock of child inserts/derived projections. No persistent
   // snapshot blob or second root is created by the adapter contract.
   s.canonical.authorityRevision=delta.authorityRevision;if(delta.terminalStatus)s.canonical.status=delta.terminalStatus;
   if(delta.authEvidence)s.canonical.auth=copy(delta.authEvidence);s.keys.push(...copy(delta.keyEvents));s.attestations.push(...copy(delta.attestations));s.seals.push(...copy(delta.attemptSeals));
   s.fence++;const stateDigest=digest('owner-decision-persistence-state-v1',{canonical:s.canonical,keys:s.keys,attestations:s.attestations,seals:s.seals}),last=s.journal.at(-1);
   const journal={id:delta.operationId,revision:s.journal.length+1,writer:delta.writer,authorityRevision:delta.authorityRevision,fence:s.fence,stateDigest,
    previousDigest:last?digest('owner-decision-journal-v1',last):null,at:f.now().toISOString()};
   s.journal.push(journal);s.receipts.push({journalId:journal.id,eventId:randomUUID(),eventDigest:digest('owner-decision-journal-v1',journal),fence:s.fence,stateDigest});
   await f.deps.save(db,s);
   const receipt:AttestationMutationReceipt={operationId:delta.operationId,decisionId:delta.decisionId,mutationDigest:attestationMutationDigest(delta),
    rowsDigest:digest('synthetic-committed-children-v1',{delta,journal}),authorityRevision:delta.authorityRevision,fence:String(s.fence)};
   (db as any).remember(receipt);return copy(receipt);
  },
  readCommittedOperation:async(db,operationId)=>{const bound=await f.deps.bound(db);assert.equal(bound.mode,'read');reads++;
   if(readback==='error')throw Error('readback unavailable');const r=committed.get(operationId);
   if(readback==='missing')return null;if(readback==='changed')return {...r,rowsDigest:hash('0')};return copy(r);
  },
  authorizePublicKey:async()=>true,ownerAuthentication:async()=>copy(f.state().canonical.auth),signer:f.deps.signer,verifier:f.deps.verifier
 };
 const adapter=createDecisionAttestationAdapter(ports,f.now),command=()=>({...f.input(),expected:attestationSourceVersion(f.state())});
 return {...f,ports,adapter,command,guards,helpers,seed:(value:1|null)=>seed=value,ack:(value:string)=>ack=value,readback:(value:string)=>readback=value,
  evidence:()=>({commits,reads}),attest:()=>adapter.attest(command())};
}
test('unapplied decision attestation persistence adapter contract',async t=>{
 let effects=0;const forbid=()=>{effects++;throw Error('external effect forbidden');};
 for(const m of ['connect','createConnection'] as const)t.mock.method(net,m,forbid);t.mock.method(net.Server.prototype,'listen',forbid);t.mock.method(tls,'connect',forbid);
 for(const module of [http,https])for(const m of ['request','get'] as const)t.mock.method(module,m,forbid);
 for(const m of ['lookup','resolve','resolve4','resolve6'] as const){t.mock.method(dns,m,forbid);t.mock.method(dns.promises,m,forbid);}
 t.mock.method(globalThis,'fetch',forbid);for(const m of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'] as const)t.mock.method(childProcess,m,forbid);
 for(const m of ['generateKeyPair','generateKeyPairSync','createPrivateKey','sign'] as const)t.mock.method(crypto,m,forbid);
 const logs:unknown[]=[];for(const m of ['log','warn','error'] as const)t.mock.method(console,m,(...v:unknown[])=>logs.push(v));
 await t.test('attestation and existing-attempt seal require separate exact committed readback',async()=>{
  const f=fixture();assert.equal((await f.attest()).ok,true);assert.deepEqual(f.evidence(),{commits:1,reads:1});
  assert.equal((await f.adapter.startCeremony(f.input())).ok,true);assert.deepEqual(f.evidence(),{commits:2,reads:2});assert.equal(f.state().seals.length,1);
  assert.equal((await f.adapter.startCeremony(f.input())).ok,false);assert.equal(f.counts().exchanges,0);
 });
 await t.test('false COMMIT success and missing/changed/unavailable readback are reconciliation_required',async()=>{
  for(const mode of ['false','missing','changed','error'])for(const operation of ['attest','seal']){const f=fixture();if(operation==='seal')await f.attest();
   if(mode==='false')f.ack(mode);else f.readback(mode);const before=f.state(),r=operation==='attest'?await f.attest():await f.adapter.startCeremony(f.input());
   assert.equal('error'in r&&r.error,'reconciliation_required');assert.equal('retryable'in r&&r.retryable,false);assert.equal(f.counts().exchanges,0);
   if(mode==='false')assert.deepEqual(f.state(),before);else{f.readback('');const signatures=f.counts().signatures;
    assert.equal((operation==='attest'?await f.attest():await f.adapter.startCeremony(f.input())).ok,false);assert.equal(f.counts().signatures,signatures);}
  }
 });
 await t.test('lost COMMIT acknowledgement seals mutation and never signs or starts again',async()=>{
  for(const writer of ['attest','ceremony_start']){const f=fixture();if(writer==='ceremony_start')await f.attest();f.fault({writer,point:'commit_ack'});
   const result=writer==='attest'?await f.attest():await f.adapter.startCeremony(f.input());assert.equal('error'in result&&result.error,'reconciliation_required');
   const signatures=f.counts().signatures;assert.equal((writer==='attest'?await f.attest():await f.adapter.startCeremony(f.input())).ok,false);assert.equal(f.counts().signatures,signatures);assert.equal(f.counts().exchanges,0);
  }
 });
 await t.test('every rollback phase preserves canonical state, child history, audit and fence',async()=>{
  for(const writer of ['attest','ceremony_start'])for(const point of ['state','history','audit','fence'] as const){const f=fixture();if(writer==='ceremony_start')await f.attest();
   const before=f.state();f.fault({writer,point});assert.equal((writer==='attest'?await f.attest():await f.adapter.startCeremony(f.input())).ok,false);assert.deepEqual(f.state(),before);assert.equal(f.counts().exchanges,0);}
 });
 await t.test('twenty concurrent attestations, ceremonies and revocations use one shared fence',async()=>{
  const f=fixture(),command=f.command();const results=await Promise.all(Array.from({length:20},()=>f.adapter.attest(command)));assert.equal(results.filter(r=>r.ok).length,1);
  const attempts=await Promise.all(Array.from({length:20},()=>f.adapter.startCeremony(f.input())));assert.equal(attempts.filter(r=>r.ok).length,1);
  const terminal={...f.command(),action:'revoke'},revokes=await Promise.all(Array.from({length:20},()=>f.adapter.terminal(terminal)));
  assert.equal(revokes.filter(r=>r.ok).length,1);assert.equal(f.state().canonical.status,'revoked');assert.equal(f.counts().exchanges,0);
 });
 await t.test('all native guard bindings and helpers reject missing, disabled, rebound or altered proof',async()=>{
  for(const group of ['guards','helpers'] as const)for(let i=0;i<(group==='guards'?decisionAttestationGuards:decisionAttestationHelpers).length;i++){
   const f=fixture();f[group][i].enabled=false;assert.equal((await f.attest()).ok,false);assert.equal(f.counts().signatures,0);
  }
  for(const mutate of [(f:ReturnType<typeof fixture>)=>f.guards.pop(),(f:ReturnType<typeof fixture>)=>f.guards[0].table='other',(f:ReturnType<typeof fixture>)=>f.guards[0].hash=hash('0'),
   (f:ReturnType<typeof fixture>)=>f.guards[0].kind=0,(f:ReturnType<typeof fixture>)=>f.guards[0].deferred=true,(f:ReturnType<typeof fixture>)=>f.helpers[0].args='0',(f:ReturnType<typeof fixture>)=>f.helpers[0].volatility='v']){const f=fixture();mutate(f);assert.equal((await f.attest()).ok,false);}
 });
 await t.test('legacy, unsigned acceptance, missing seams and owner ambiguity remain blocked',async()=>{
  for(const change of [(f:ReturnType<typeof fixture>)=>f.seed(null),(f:ReturnType<typeof fixture>)=>f.ports.signer=undefined,(f:ReturnType<typeof fixture>)=>f.ports.verifier=undefined,
   (f:ReturnType<typeof fixture>)=>f.source('owner_membership',c=>c.ownerMembershipIds.push(randomUUID())),(f:ReturnType<typeof fixture>)=>f.source('owner_membership',c=>c.primaryOwnerId=randomUUID())]){
   const f=fixture();change(f);assert.equal((await f.attest()).ok,false);assert.equal(f.counts().exchanges,0);}
  const f=fixture();assert.equal((await f.adapter.startCeremony(f.input())).ok,false);assert.equal((await createDecisionAttestationAdapter().attest(f.command())).ok,false);
 });
 await t.test('owner authentication comes only from injected current session evidence',async()=>{
  const f=fixture(),e=f.state().canonical.auth;f.source('owner_auth_evidence',c=>c.auth=null);f.ports.ownerAuthentication=async()=>e;
  assert.equal((await f.adapter.recordOwnerAuth(f.command())).ok,true);assert.equal((await f.adapter.recordOwnerAuth(f.command())).ok,false);assert.equal((await f.attest()).ok,true);
  const g=fixture();g.source('owner_auth_evidence',c=>c.auth=null);g.ports.ownerAuthentication=undefined;assert.equal((await g.adapter.recordOwnerAuth(g.command())).ok,false);
 });
 await t.test('public key authorization, stage/cutover/retire/revoke and exact key history',async()=>{
  for(const action of ['create','adopt']){const initial=fixture(true);assert.equal((await initial.adapter.key({...initial.command(),operation:{id:randomUUID(),action,
   keyId:initial.first.keyId,material:initial.first,overlapStartsAt:null,cutoverAt:null}})).ok,true);assert.equal((await initial.attest()).ok,true);}
  const f=fixture(),m=f.material(2);const operation=(action:string,keyId:string,material:any=null,overlapStartsAt:string|null=null,cutoverAt:string|null=null)=>
   ({...f.command(),operation:{id:randomUUID(),action,keyId,material,overlapStartsAt,cutoverAt}});
  f.ports.authorizePublicKey=undefined;assert.equal((await f.adapter.key(operation('stage',m.keyId,m,f.iso(1000),f.iso(3000)))).ok,false);f.ports.authorizePublicKey=async()=>true;
  assert.equal((await f.attest()).ok,true);assert.equal((await f.adapter.key(operation('stage',m.keyId,m,f.iso(1000),f.iso(3000)))).ok,true);
  f.advance(1000);assert.equal((await f.adapter.inspect(f.input())).ok,true);f.advance(2000);assert.equal((await f.adapter.key(operation('cutover',m.keyId))).ok,true);
  assert.equal((await f.adapter.key(operation('retire',f.first.keyId))).ok,true);assert.equal((await f.adapter.startCeremony(f.input())).ok,false);
  assert.equal((await f.adapter.key(operation('revoke',m.keyId))).ok,true);assert.equal((await f.adapter.key(operation('cutover',m.keyId))).ok,false);
 });
 await t.test('supersede/revoke/expire/reject and binding/policy drift prevent ceremony',async()=>{
  for(const action of ['supersede','revoke','expire','reject']){const f=fixture();await f.attest();if(action==='expire')f.advance(60000);
   assert.equal((await f.adapter.terminal({...f.command(),action})).ok,true);assert.equal((await f.adapter.startCeremony(f.input())).ok,false);assert.equal(f.counts().exchanges,0);}
  const f=fixture();await f.attest();f.source('policy',c=>c.ceremony.policyRevision++);assert.equal((await f.adapter.startCeremony(f.input())).ok,false);
 });
 await t.test('READ ONLY inspection is pure and request authority/transport overrides deny',async()=>{
  const f=fixture();await f.attest();const before=f.state();assert.equal((await f.adapter.inspect(f.input())).ok,true);assert.deepEqual(f.state(),before);
  for(const key of ['signer','privateKey','signature','ownerId','url','target','model','profile','force'])assert.equal((await f.adapter.startCeremony({...f.input(),[key]:'override'})).ok,false);
  assert.deepEqual(f.state(),before);assert.equal(f.counts().exchanges,0);
 });
 await t.test('migration is additive, contains only children, and private signing API is absent',()=>{
  const sql=readFileSync('prisma/migrations/20260925010000_decision_attestation/migration.sql','utf8');
  assert.doesNotMatch(sql,/CREATE OR REPLACE|DROP\s|DELETE FROM|UPDATE\s+decisions|DISABLE TRIGGER/i);
  assert.match(sql,/ADD COLUMN authority_revision BIGINT CHECK\(authority_revision=1\)/);assert.doesNotMatch(sql,/authority_revision BIGINT.*DEFAULT/);
  assert.deepEqual([...sql.matchAll(/CREATE TABLE (\w+)/g)].map(m=>m[1]),['decision_owner_auth_evidence','decision_attestation_key_history','decision_attestations','decision_authority_events','decision_attestation_write_receipts']);
  assert.match(sql,/ALTER TABLE worker_bootstrap_attempts ADD COLUMN attestation_seal/);assert.match(sql,/task_interview_entries/);assert.match(sql,/interval '120 seconds'/);
  for(const path of ['src/modules/api-keys/decision-attestation-adapter.ts','src/modules/api-keys/decision-attestation-key-model.ts','src/modules/api-keys/decision-attestation-persistence-model.ts'])
   assert.doesNotMatch(readFileSync(path,'utf8'),/BEGIN PRIVATE KEY|createPrivateKey|generateKeyPair|crypto\.sign|readFileSync|process\.env/);
  assert.equal(readdirSync('prisma/migrations').filter(n=>/^\d/.test(n)).sort().indexOf('20260925010000_decision_attestation'),82);
 });
 assert.equal(effects,0);assert.deepEqual(logs,[]);
});
