import test from 'node:test';
import assert from 'node:assert/strict';
import crypto,{randomUUID} from 'node:crypto';
import net from 'node:net';import tls from 'node:tls';import http from 'node:http';import https from 'node:https';import dns from 'node:dns';import childProcess from 'node:child_process';
import {readFileSync} from 'node:fs';
import {nativeAttestationFixture} from './decision-attestation-prisma-fixture';
import {createPrismaDecisionAttestationPorts} from '../modules/api-keys/decision-attestation-prisma-ports';
import {exactTime} from '../modules/api-keys/decision-attestation-sql';
import {attestationDigest} from '../modules/api-keys/decision-attestation-key-model';

test('concrete unapplied Prisma decision attestation ports',async t=>{
 let effects=0;const forbid=()=>{effects++;throw Error('external effect forbidden');};
 for(const method of ['connect','createConnection'] as const)t.mock.method(net,method,forbid);
 t.mock.method(net.Server.prototype,'listen',forbid);t.mock.method(tls,'connect',forbid);
 for(const module of [http,https])for(const method of ['request','get'] as const)t.mock.method(module,method,forbid);
 for(const method of ['lookup','resolve','resolve4','resolve6'] as const){t.mock.method(dns,method,forbid);t.mock.method(dns.promises,method,forbid);}
 t.mock.method(globalThis,'fetch',forbid);
 for(const method of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'] as const)t.mock.method(childProcess,method,forbid);
 for(const method of ['generateKeyPair','generateKeyPairSync','createPrivateKey','sign'] as const)t.mock.method(crypto,method,forbid);
 await t.test('native projection derives authority revision from complete events, retains DB clock and exact accepted policy',async()=>{
  const f=nativeAttestationFixture(),p=await f.projection();assert.equal(p.version.authorityRevision,'2');assert.equal(p.policy.revision,7);
  assert.match(p.clock.at,/123Z$/);assert.equal(p.usable,true);assert.equal(f.stats().writes,0);assert.ok(f.calls.every(c=>!c.sql.includes('FOR UPDATE')));
  assert.equal(exactTime('2026-09-25T12:01:02.123456+02:00'),'2026-09-25T10:01:02.123456Z');
 });
 await t.test('attest, inspect and atomic seal map actual automatic receipts and separate read-only transactions',async()=>{
  const f=nativeAttestationFixture(),r=await f.execute('attest');assert.equal(r.ok,true,JSON.stringify(r));if(!r.ok)return;
  assert.equal(r.receipt.authorityRevision,'3');assert.match(r.receipt.recordedAt,/123Z$/);assert.ok(f.stats().reads>0);
  assert.equal((await f.ports.inspect(f.q)).ok,true);
  const before=f.calls.length,s=await f.execute('seal');assert.equal(s.ok,true,JSON.stringify(s));if(!s.ok)return;
  const writes=f.calls.slice(before).filter(c=>c.sql.startsWith('INSERT'));
  assert.equal(new Set(writes.map(c=>c.db)).size,1);assert.equal(writes.length,5);
  assert.ok(writes[0].sql.includes('worker_bootstrap_lifecycle_events'));assert.ok(writes[1].sql.includes('worker_bootstrap_attempts'));
  for(const write of writes.filter(w=>w.sql.includes('worker_bootstrap_lifecycle_events')))
   assert.match(JSON.parse(String(write.values[4])).at,/\.\d{3}Z$/);
  const row=f.objects().find(o=>o.table==='worker_bootstrap_attempts')!.row;
  assert.equal(row.attestation_seal.state,'started');assert.equal(row.attestation_seal.attestationDigest,f.objects().find(o=>o.table==='decision_attestations')!.row.record_digest);
  assert.ok(BigInt(row.attestation_seal.sourceFence)<BigInt(s.receipt.fence));assert.match(row.attestation_committed_at,/123Z$/);
  assert.equal((await f.ports.inspect(f.q)).ok,true);assert.equal((await f.execute('seal')).ok,false);
  const writeDb=writes[0].db;assert.ok(f.calls.some(c=>c.sql.includes('operationCount')&&c.mode==='read'&&c.db!==writeDb));
 });
 await t.test('owner-auth child uses injected evidence and denies caller override of server fields',async()=>{
  const f=nativeAttestationFixture();f.remove('decision_owner_auth_evidence');assert.equal((await f.execute('auth')).ok,true);
  const g=nativeAttestationFixture(),c=await g.command('attest');
  for(const extra of [{committedAt:g.iso()},{fence:'999'},{authorityRevision:'999'},{record:{}},{audit:{}}])assert.equal((await g.ports.execute({...c,...extra})).ok,false);
  assert.equal(g.stats().writes,0);
 });
 await t.test('key lifecycle inserts only public records with DB time, including create/adopt/stage/cutover/retire/revoke',async()=>{
  for(const action of ['create','adopt']){const f=nativeAttestationFixture();f.remove('decision_attestation_key_history');const id=randomUUID();
   const command=await f.command('key',{operation:{id,action,keyId:f.material.keyId,material:f.material,overlapStartsAt:null,cutoverAt:null}});command.operationId=id;
   assert.equal((await f.ports.execute(command)).ok,true);}
  const f=nativeAttestationFixture(),id=randomUUID(),material={...f.material,keyId:randomUUID(),epoch:2,publicKey:'b'.repeat(64)};
  material.publicKeyDigest=attestationDigest('owner-decision-public-key-v1',{algorithm:material.algorithm,format:material.format,publicKey:material.publicKey});
  const command=await f.command('key',{operation:{id,action:'stage',keyId:material.keyId,material,overlapStartsAt:f.iso(1000),cutoverAt:f.iso(2000)}});command.operationId=id;
  assert.equal((await f.ports.execute(command)).ok,true);
  f.at(f.iso(2000).replace('Z','123Z'));
  for(const [action,keyId] of [['cutover',material.keyId],['retire',f.material.keyId],['revoke',material.keyId]]){const operationId=randomUUID();
   const c=await f.command('key',{operation:{id:operationId,action,keyId,material:null,overlapStartsAt:null,cutoverAt:null}});c.operationId=operationId;
   assert.equal((await f.ports.execute(c)).ok,true,action);}
  assert.equal(f.stats().signatures,0);
 });
 await t.test('terminal event appends, never updates accepted decision or reopens admission',async()=>{
  for(const action of ['supersede','revoke','reject','expire']){const f=nativeAttestationFixture();await f.execute('attest');if(action==='expire')f.at(f.iso(60001).replace('Z','123Z'));
   assert.equal((await f.execute('terminal',{action})).ok,true,action);assert.equal((await f.ports.inspect(f.q)).ok,false);
   assert.equal(f.objects().find(o=>o.table==='decisions')!.row.status,'accepted');assert.equal((await f.execute('terminal',{action})).ok,false);}
 });
 await t.test('legacy, partial history, owner changes and stale policy/key/ticket/anchors fail closed',async()=>{
  const mutations=[(f:ReturnType<typeof nativeAttestationFixture>)=>{f.objects().find(o=>o.table==='decisions')!.row.authority_revision=null;},
   (f:ReturnType<typeof nativeAttestationFixture>)=>f.remove('decision_authority_events'),
   (f:ReturnType<typeof nativeAttestationFixture>)=>{f.objects().find(o=>o.table==='workspaces')!.row.owner_user_id=randomUUID();},
   (f:ReturnType<typeof nativeAttestationFixture>)=>{f.objects().find(o=>o.table==='decision_revisions')!.row.body.ownerDecisionAttestation.revision=8;},
   (f:ReturnType<typeof nativeAttestationFixture>)=>{f.objects().find(o=>o.table==='decision_attestation_key_history')!.row.record_digest='f'.repeat(64);},
   (f:ReturnType<typeof nativeAttestationFixture>)=>f.verified(false),
   (f:ReturnType<typeof nativeAttestationFixture>)=>f.origin(false)];
  for(const mutate of mutations){const f=nativeAttestationFixture(),c=await f.command('attest');mutate(f);assert.equal((await f.ports.execute(c)).ok,false);assert.equal(f.stats().writes,0);}
  for(const fault of ['current','history','generation','ticket','signature','policy','key','grant']){const f=nativeAttestationFixture(),c=await f.command('attest');f.fault(fault);assert.equal((await f.ports.execute(c)).ok,false);assert.equal(f.stats().writes,0);}
 });
 await t.test('missing/rebound/altered/disabled guards and helpers deny before writes',async()=>{
  for(const target of ['guard','helper'])for(const kind of ['missing','disabled','hash','name']){const f=nativeAttestationFixture(),c=await f.command('attest'),rows=target==='guard'?f.guards:f.helpers;
   if(kind==='missing')rows.pop();else if(kind==='disabled')rows[0].enabled=false;else rows[0][kind]='altered';assert.equal((await f.ports.execute(c)).ok,false);assert.equal(f.stats().writes,0);}
 });
 await t.test('false/lost/unknown ACK and absent/mismatched/readback failure are nonretryable reconciliation',async()=>{
  for(const kind of ['attest','seal','terminal'])for(const fault of ['false','lost','precommit','missing','mismatch','readback','retry','incomplete','event']){const f=nativeAttestationFixture();if(kind==='seal')assert.equal((await f.execute('attest')).ok,true);
   const command=await f.command(kind,kind==='terminal'?{action:'revoke'}:{}),before=f.stats();f.fault(fault);const r=await f.ports.execute(command);
   assert.equal(r.ok,false,kind+':'+fault);assert.equal('error'in r&&r.error,'reconciliation_required',kind+':'+fault);assert.equal('retryable'in r&&r.retryable,false);
   assert.ok(f.stats().signatures-before.signatures<=1);
  }
 });
 await t.test('each start write phase rolls back all attempt/lifecycle changes',async()=>{
  for(const table of ['worker_bootstrap_lifecycle_events','worker_bootstrap_attempts','worker_bootstrap_history','worker_bootstrap_heads']){const f=nativeAttestationFixture();assert.equal((await f.execute('attest')).ok,true);
   const c=await f.command('seal'),before=f.state();f.fault('table:'+table);assert.equal((await f.ports.execute(c)).ok,false);assert.deepEqual(f.state(),before);assert.equal(f.stats().faultHits,1,table);}
  for(const kind of ['attest','auth','terminal','key']){const f=nativeAttestationFixture();if(kind==='auth')f.remove('decision_owner_auth_evidence');
   const operationId=randomUUID(),extra=kind==='terminal'?{action:'reject'}:kind==='key'?{operation:{id:operationId,action:'revoke',keyId:f.material.keyId,material:null,overlapStartsAt:null,cutoverAt:null}}:{};
   const c=await f.command(kind,extra);if(kind==='key')c.operationId=operationId;const before=f.state();f.fault('receipt');assert.equal((await f.ports.execute(c)).ok,false);assert.deepEqual(f.state(),before);}
 });
 await t.test('20 concurrent attest/seal/terminal commands admit one CAS winner without retries',async()=>{
  for(const kind of ['attest','seal','terminal']){const f=nativeAttestationFixture();if(kind==='seal')assert.equal((await f.execute('attest')).ok,true);
   const c=await f.command(kind,kind==='terminal'?{action:'revoke'}:{}),before=f.stats();
   const result=await Promise.all(Array.from({length:20},()=>f.ports.execute({...c,operationId:randomUUID()})));
   assert.equal(result.filter(r=>r.ok).length,1,kind);assert.ok(f.stats().signatures-before.signatures<=1);}
 });
 await t.test('all injected authorities are mandatory, unbound ports deny and authority callbacks cannot mutate the source',async()=>{
  for(const missing of ['signer','verifier','ticketVerifier','ownerAuthentication','authorizePublicKey'] as const){const f=nativeAttestationFixture();
   const deps={...f.deps,[missing]:undefined},ports=createPrismaDecisionAttestationPorts(deps),operationId=randomUUID();
   const kind=missing==='ownerAuthentication'?'auth':missing==='authorizePublicKey'?'key':'attest';if(kind==='auth')f.remove('decision_owner_auth_evidence');
   const c=await f.command(kind,kind==='key'?{operation:{id:operationId,action:'revoke',keyId:f.material.keyId,material:null,overlapStartsAt:null,cutoverAt:null}}:{});
   if(kind==='key')c.operationId=operationId;assert.equal((await ports.execute(c)).ok,false);assert.equal(f.stats().writes,0);}
  const f=nativeAttestationFixture();await assert.rejects(()=>f.ports.projectCanonical({} as any,f.q));
  f.deps.signer!.sign=async()=>{f.objects().find(o=>o.table==='workspaces')!.row.owner_user_id=randomUUID();return 'a'.repeat(128);};
  assert.equal((await f.execute('attest')).ok,false);assert.equal(f.stats().writes,0);
 });
 await t.test('rollback at the final consume write leaves no reserved ticket, attempt, history, head or audit',async()=>{
  const f=nativeAttestationFixture();assert.equal((await f.execute('attest')).ok,true);const c=await f.command('seal'),before=f.state();
  f.fault('write:'+(f.stats().writes+5));assert.equal((await f.ports.execute(c)).ok,false);assert.deepEqual(f.state(),before);
  assert.equal(f.stats().faultHits,1);
 });
 await t.test('every value is bound; SQL identifiers are fixed; read ports never mutate or construct clients',async()=>{
  const f=nativeAttestationFixture();await f.execute('attest');await f.execute('seal');
  for(const call of f.calls){for(const value of call.values)if(typeof value==='string'&&value.length>20)assert.equal(call.sql.includes(value),false);
   if(call.mode==='read')assert.doesNotMatch(call.sql,/\b(INSERT INTO|UPDATE \w+ SET|DELETE FROM|FOR UPDATE|SET TRANSACTION)\b/);}
  for(const file of ['decision-attestation-sql','decision-attestation-projection','decision-attestation-prisma-ports']){
   const source=readFileSync(`src/modules/api-keys/${file}.ts`,'utf8');assert.doesNotMatch(source,/\$\w+RawUnsafe|Prisma\.raw|new PrismaClient|\$transaction\(|createPrivateKey|generateKeyPair|crypto\.sign|fetch\(/);
  }
  assert.equal((await f.ports.execute({...await f.command('seal'),kind:'dispatch'})).ok,false);
  assert.match(readFileSync('prisma/migrations/20260925010000_decision_attestation/migration.sql','utf8'),/decision_attestation_start_commit_required/);
  assert.equal((await createPrismaDecisionAttestationPorts({...f.deps,signer:undefined}).execute(await f.command('attest'))).ok,false);
 });
 assert.equal(effects,0);
});
