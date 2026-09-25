import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import net from 'node:net';import tls from 'node:tls';import http from 'node:http';import https from 'node:https';import dns from 'node:dns';import childProcess from 'node:child_process';
import {readFileSync} from 'node:fs';
import {proofPersistenceFixture,proofId,publicMaterials} from './bootstrap-proof-persistence-fixture';
import {createPrismaProofAuthorityStore} from '../modules/api-keys/bootstrap-proof-persistence';
import {replayProofKeys} from '../modules/api-keys/bootstrap-proof-key-contract';
import {lifecycleFlags} from '../modules/api-keys/bootstrap-ticket-lifecycle-contract';
import {decisionAuthority} from '../modules/decisions/decision-authority';

async function enrolled(){const f=proofPersistenceFixture();assert.equal((await f.api.applyKey(f.command('local_worker'))).ok,true);assert.equal((await f.api.applyKey(f.command('roost_server'))).ok,true);return f;}
test('source-only proof persistence: concrete SQL ports against transactional mocks',async t=>{
 let effects=0;const forbidden=()=>{effects++;throw Error('forbidden private/external effect');};
 for(const m of ['generateKeyPair','generateKeyPairSync','createPrivateKey','sign','verify'] as const)t.mock.method(crypto,m,forbidden);
 for(const m of ['connect','createConnection'] as const)t.mock.method(net,m,forbidden);t.mock.method(net.Server.prototype,'listen',forbidden);t.mock.method(tls,'connect',forbidden);
 for(const mod of [http,https])for(const m of ['request','get'] as const)t.mock.method(mod,m,forbidden);
 for(const m of ['lookup','resolve','resolve4','resolve6'] as const){t.mock.method(dns,m,forbidden);t.mock.method(dns.promises,m,forbidden);}
 t.mock.method(globalThis,'fetch',forbidden);for(const m of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'] as const)t.mock.method(childProcess,m,forbidden);
 const logs:unknown[]=[];for(const m of ['log','warn','error'] as const)t.mock.method(console,m,(...args:unknown[])=>logs.push(args));

 await t.test('first enrollment: same Db roots/history/write; independent READ ONLY committed readback',async()=>{
  const f=await enrolled(),command=f.attachment(),r=await f.api.attach(command);assert.equal(r.ok,true,JSON.stringify(r));
  for(const flag of Object.keys(lifecycleFlags))assert.equal((r as any)[flag],false);
  const before=f.state(),stats=f.stats(),read=await f.api.inspect(command.attachment);assert.equal(read.ok,true,JSON.stringify(read));assert.deepEqual(f.state(),before);assert.equal(f.stats().writes,stats.writes);
  assert.equal((await f.api.attach(command)).ok,true);assert.equal(f.stats().writes,stats.writes);
  const writes=f.calls.filter(c=>c.sql.includes('proof insert attachment'));assert.equal(writes.length,1);
  const db=writes[0].db;assert.ok(f.calls.some(c=>c.db===db&&c.sql.includes('proof owner')));assert.ok(f.calls.some(c=>c.db===db&&c.sql.includes('proof history')));
  assert.ok(f.calls.some(c=>c.db>db&&c.mode==='read'&&c.sql.includes('proof operation')));
  assert.ok(f.options.every(o=>['Serializable','RepeatableRead'].includes(o.isolationLevel)));
  assert.ok(f.calls.filter(c=>c.mode==='read').every(c=>!/(INSERT INTO|UPDATE ready_source|SET CONSTRAINTS)/.test(c.sql)));
 });
 await t.test('create/adopt/stage/cutover/retire/revoke and recovery attachment preserve exact history',async()=>{
  const f=await enrolled(),first=f.attachment();assert.equal((await f.api.attach(first)).ok,true);
  assert.equal((await f.api.applyKey(f.command('local_worker','revoke'))).ok,true);
  const stage=f.command('local_worker','stage',{targetEpoch:2,material:publicMaterials[1],activatesAt:'2026-09-25T12:00:01.000Z',cutoverAt:'2026-09-25T12:00:02.000Z'});
  assert.equal((await f.api.applyKey(stage)).ok,true);f.setNow('2026-09-25T12:00:02.000Z');assert.equal((await f.api.applyKey(f.command('local_worker','cutover'))).ok,true);
  const recovery=f.attachment(first.attachment);assert.equal((await f.api.attach(recovery)).ok,true);assert.equal((await f.api.inspect(recovery.attachment)).ok,true);
  assert.equal((await f.api.inspect(first.attachment)).ok,false);assert.equal(replayProofKeys(f.history('local_worker')).highWater,2);
  const adopt=proofPersistenceFixture();assert.equal((await adopt.api.applyKey(adopt.command('local_worker','adopt',{targetEpoch:7}))).ok,true);
  const retired=proofPersistenceFixture();assert.equal((await retired.api.applyKey(retired.command('local_worker'))).ok,true);
  assert.equal((await retired.api.applyKey(retired.command('local_worker','stage',{targetEpoch:2,material:publicMaterials[1],activatesAt:'2026-09-25T12:00:01.000Z',cutoverAt:'2026-09-25T12:00:02.000Z'}))).ok,true);
  retired.setNow('2026-09-25T12:00:02.000Z');assert.equal((await retired.api.applyKey(retired.command('local_worker','retire',{targetEpoch:1}))).ok,true);
 });
 await t.test('twenty competing writers reserve one epoch; twenty readers stay pure',async()=>{
  const f=proofPersistenceFixture(),commands=Array.from({length:20},()=>f.command('local_worker'));
  const results=await Promise.all(commands.map(c=>f.api.applyKey(c)));assert.equal(results.filter(r=>r.ok).length,1);assert.equal(f.state().rows.length,1);
  const before=f.state(),count=f.stats().writes,op=f.state().rows[0].id;
  const reads=await Promise.all(Array.from({length:20},()=>f.api.inspectOperation('bootstrap_proof_key_history',op)));assert.ok(reads.every(r=>r.ok));assert.deepEqual(f.state(),before);assert.equal(f.stats().writes,count);
 });
 for(const fault of ['insert','audit','event','receipt','deferred_commit','source_drift'])await t.test(`rollback at ${fault}: no partial row/Event/receipt survives`,async()=>{
  const f=proofPersistenceFixture(),command=f.command('local_worker'),before=f.state();f.faults(fault);const r=await f.api.applyKey(command);
  assert.equal(r.ok,false);assert.equal('retryable' in r&&r.retryable,false);assert.deepEqual(f.state(),before);assert.equal(f.stats().writes,1);
 });
 for(const fault of ['false_commit','false_callback','lost_commit','readback','missing','mismatch'])await t.test(`${fault}: no false success or automatic retry`,async()=>{
  const f=proofPersistenceFixture(),command=f.command('local_worker');f.faults(fault);const r=await f.api.applyKey(command);
  assert.equal(r.ok,false);assert.equal('error' in r&&r.error,'reconciliation_required');assert.equal('retryable' in r&&r.retryable,false);assert.equal(f.stats().writes,1);
  f.faults('');const inspection=await f.api.inspectOperation('bootstrap_proof_key_history',command.operationId);assert.equal(inspection.ok,true);
  assert.equal(inspection.ok&&'operation' in inspection&&!!inspection.operation,!['false_commit','false_callback'].includes(fault));assert.equal(f.stats().writes,1);
 });
 await t.test('attachment rollback at all six write/audit/Event/receipt/constraint/source phases',async()=>{
  for(const fault of ['insert','audit','event','receipt','deferred_commit','source_drift']){
   const f=await enrolled(),a=f.attachment(),before=f.state(),writes=f.stats().writes;f.faults(fault);
   const r=await f.api.attach(a);assert.equal(r.ok,false);assert.equal('retryable' in r&&r.retryable,false);assert.deepEqual(f.state(),before);assert.equal(f.stats().writes,writes+1);
  }
 });
 for(const fault of ['legacy','missing_guard','disabled','body','rebound','predicate','deferred','replica','search_path','foreign_key','unvalidated_fk','lifecycle'])await t.test(`guard/root failure ${fault} denies before writes`,async()=>{
  const f=proofPersistenceFixture(),command=f.command('local_worker');f.faults(fault);assert.equal((await f.api.applyKey(command)).ok,false);assert.equal(f.stats().writes,0);
 });
 await t.test('wrong owner, purpose, lifecycle, history and cross-purpose material cannot gain authority',async()=>{
  const wrongOwner=proofPersistenceFixture(),wrongCommand=wrongOwner.command('local_worker');wrongOwner.decisions.get(wrongCommand.decisionId)!.owner=proofId();assert.equal((await wrongOwner.api.applyKey(wrongCommand)).ok,false);assert.equal(wrongOwner.stats().writes,0);
  for(const change of [(c:any)=>c.intent.scope.purpose='worker-bootstrap-owner-ticket-v1',(c:any)=>c.intent.scope.installationId=proofId(),(c:any)=>c.intent.generation.hostGeneration=proofId(),(c:any)=>c.decisionRevision++]){
   const f=proofPersistenceFixture(),c=f.command('local_worker');change(c);assert.equal((await f.api.applyKey(c)).ok,false);assert.equal(f.stats().writes,0);
  }
  const f=await enrolled(),a=f.attachment();a.attachment.worker.historyDigest='f'.repeat(64);f.approve('workerBootstrapProofAuthority',a.attachment,a.attachment.decisionId);assert.equal((await f.api.attach(a)).ok,false);
  const c=f.command('local_worker','stage',{targetEpoch:2,material:publicMaterials[2],activatesAt:'2026-09-25T12:00:01.000Z',cutoverAt:'2026-09-25T12:00:02.000Z'});assert.equal((await f.api.applyKey(c)).ok,false);
 });
 await t.test('tampered committed binary bytes/receipt/Event are never accepted by readback',async()=>{
  for(const mutate of [(s:any)=>s.rows[0].bytes='00',(s:any)=>s.rows[0].record.intent.scope.purpose='owner-decision-attestation-v1',(s:any)=>s.receipts.pop(),(s:any)=>s.events[0].writerXid='999999']){
   const f=proofPersistenceFixture(),c=f.command('local_worker');assert.equal((await f.api.applyKey(c)).ok,true);f.tamper(mutate);
   assert.equal((await f.api.inspectOperation('bootstrap_proof_key_history',c.operationId)).ok,false);
  }
 });
 await t.test('missing composition, unknown fields and delegated authority stay blocked/owner-reserved',async()=>{
  const f=proofPersistenceFixture(),c=f.command('local_worker');assert.equal((await createPrismaProofAuthorityStore().applyKey(c)).ok,false);
  assert.equal((await f.api.applyKey({...c,privateKey:'not-permitted'})).ok,false);assert.equal(f.stats().writes,0);
  for(const field of ['workerBootstrapProofKey','workerBootstrapProofAuthority']){
   const r=await decisionAuthority({} as any,f.workspaceId,{[field]:{},authority:{domain:'ordinary_domain'}},{},{ownerUserId:f.ownerId,ownerActive:true,truncated:false,mandates:[],workers:[],labels:[]});assert.equal(r.status,'owner_reserved');
  }
 });
 await t.test('migration is additive public children only; legacy/v3 seal remains explicitly blocked',()=>{
  const sql=readFileSync('prisma/migrations/20260925040000_bootstrap_proof_authority/migration.sql','utf8');
  assert.doesNotMatch(sql,/CREATE OR REPLACE|ALTER TABLE|DROP TABLE|DELETE FROM|INSERT INTO api_keys|DEFAULT /i);
  assert.equal((sql.match(/CREATE TABLE /g)??[]).length,4);assert.match(sql,/bootstrap_proof_v3_seal_unavailable/);assert.match(sql,/FOREIGN KEY\(decision_id,workspace_id,decision_revision\)/);
  assert.match(sql,/UPDATE ready_source_fence SET revision=revision WHERE id=1/);assert.match(sql,/DEFERRABLE INITIALLY DEFERRED/);
 });
 assert.equal(effects,0);assert.deepEqual(logs,[]);
});
