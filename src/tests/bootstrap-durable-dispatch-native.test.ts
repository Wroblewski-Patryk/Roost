import test from 'node:test';
import assert from 'node:assert/strict';
import crypto,{randomUUID} from 'node:crypto';
import net from 'node:net';import tls from 'node:tls';import http from 'node:http';import https from 'node:https';import dns from 'node:dns';import childProcess from 'node:child_process';
import {PrismaClient} from '@prisma/client';
import {attestationNativeFixture,owned,prepare,NativeRegistrationDenied} from './decision-attestation-native-fixture';
import {ticketFixture} from './bootstrap-ticket-native-fixture';
import {nativeDispatchHarness,type NativeDispatchHarness} from './bootstrap-dispatch-native-fixture';
import {dispatchDigest,type DispatchCommand} from '../modules/api-keys/bootstrap-dispatch-contract';
import {dispatchGuards} from '../modules/api-keys/bootstrap-dispatch-guards';
import {createAttestedBootstrapComposition} from '../modules/api-keys/bootstrap-attested-composition';
import {createDurableDispatchAdapter} from '../modules/api-keys/bootstrap-dispatch-prisma';
import {createPrismaBootstrapChannelStore} from '../modules/api-keys/bootstrap-channel-store';
import {lifecycleFlags} from '../modules/api-keys/bootstrap-ticket-lifecycle-contract';

test('native durable bootstrap dispatch/completion',{skip:!process.env.WORKER_IDENTITY_NATIVE_DATABASE,timeout:850000},async t=>{
 const db=new PrismaClient(),url=new URL(process.env.DATABASE_URL!);url.searchParams.set('connection_limit','1');
 const clients=Array.from({length:20},()=>new PrismaClient({datasources:{db:{url:url.toString()}}}));
 await db.$connect();await owned(db);for(const client of clients){await client.$connect();await owned(client);}
 t.after(async()=>{await Promise.allSettled(clients.map(c=>c.$disconnect()));await db.$disconnect();});
 const pids=await Promise.all(clients.map(c=>c.$queryRaw<any[]>`SELECT pg_backend_pid() AS pid`));assert.equal(new Set(pids.flat().map(r=>r.pid)).size,20);
 let effects=0,registrationBlocked=false;const forbid=()=>{effects++;throw Error('non-database effect forbidden');};
 for(const m of ['connect','createConnection'] as const)t.mock.method(net,m,forbid);t.mock.method(net.Server.prototype,'listen',forbid);t.mock.method(tls,'connect',forbid);
 for(const mod of [http,https])for(const m of ['request','get'] as const)t.mock.method(mod,m,forbid);
 for(const m of ['lookup','resolve','resolve4','resolve6'] as const){t.mock.method(dns,m,forbid);t.mock.method(dns.promises,m,forbid);}
 t.mock.method(globalThis,'fetch',forbid);for(const m of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'] as const)t.mock.method(childProcess,m,forbid);
 for(const m of ['generateKeyPair','generateKeyPairSync','createPrivateKey','sign'] as const)t.mock.method(crypto,m,forbid);
 await db.$executeRawUnsafe("CREATE FUNCTION native_dispatch_fail() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic dispatch deferred rejection'; END $$");
 const tables=['workspaces','workspace_memberships','agent_hosts','worker_identity_lifecycle','worker_identity_lifecycle_audit',
  'bootstrap_issuer_history','bootstrap_issuer_audit','decisions','decision_revisions','decision_acceptances','decision_impact_previews',
  'decision_attestation_key_history','decision_owner_auth_evidence','decision_attestations','decision_authority_events','decision_attestation_write_receipts',
  'worker_transport_bootstrap_grants','worker_transport_history','worker_transport_heads','worker_transport_audit','worker_transport_write_audit',
  'worker_bootstrap_tickets','worker_bootstrap_attempts','worker_bootstrap_history','worker_bootstrap_heads','worker_bootstrap_audit',
  'worker_bootstrap_lifecycle_events','worker_bootstrap_write_receipts','ready_source_fence','events','worker_bootstrap_dispatch_history','worker_bootstrap_dispatch_receipts'];
 async function snapshot(){return db.$queryRawUnsafe(tables.map(table=>`SELECT '${table}' AS tbl,count(*)::int AS count,md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY to_jsonb(t)::text),'')) AS digest FROM ${table} t`).join(' UNION ALL ')+' ORDER BY tbl');}
 async function fresh(options:Parameters<typeof attestationNativeFixture>[1]={}){
  assert.equal(registrationBlocked,false,'Registration risk reopened; stop fixture registration');let f:Awaited<ReturnType<typeof attestationNativeFixture>>;
  try{f=await attestationNativeFixture(db,options);}catch(e){if(e instanceof NativeRegistrationDenied){registrationBlocked=true;
   console.error(JSON.stringify({alert:'unexpected_registration_denial',reopen:true,retryable:false}));}throw e;}
  await f.ready();for(const kind of ['attest','seal'])assert.equal((await f.ports.execute(await f.command(kind))).ok,true,JSON.stringify(f.errors));
  const rows=await db.$queryRaw<any[]>`SELECT id FROM worker_bootstrap_attempts WHERE ticket_id=${f.q.ticketId}::uuid`;
  assert.equal(rows.length,1);return nativeDispatchHarness(db,clients,f,rows[0].id);
 }
 const uncertain=(r:any)=>{assert.equal(r.ok,false);assert.equal(r.error,'reconciliation_required');assert.equal(r.retryable,false);assert.equal(r.sendAuthorized,false);assert.equal(r.completionAuthorized,false);};
 async function waitUntil(at:string){const ms=Date.parse(at)-Date.now()+100;if(ms>0){assert.ok(ms<15000);await new Promise(r=>setTimeout(r,ms));}}
 async function claimedInput(h:NativeDispatchHarness){const p=(await h.head())!;return {...h.scope,ownerId:p.ownerId,ownerEpoch:p.ownerEpoch,claimGeneration:p.claimGeneration,
  expectedRevision:p.revision,expectedDigest:dispatchDigest(p)};}
 async function operation(action:DispatchCommand['action']){
  const h=await fresh();
  if(action==='prepare')return {h,c:await h.command(action)};
  if(action==='claim')await h.through('sealed_ready');
  else if(action==='resume'){await h.through('claimed_not_sent',1500);await waitUntil((await h.head())!.leaseExpiresAt!);}
  else if(action==='start_send'||action==='cancel')await h.through('claimed_not_sent');
  else if(action==='start_complete')await h.through('delivered');
  else if(action==='complete')await h.through('completion_started');
  else{await h.through('send_started');if(action==='reconcile'||action==='recover')await h.step('unknown');if(action==='recover')await h.step('reconcile');}
  h.clear();return {h,c:await h.command(action)};
 }
 const phases=['prepare','claim','resume','start_send','outcome','unknown','start_complete','complete','require_reconciliation','reconcile','recover','cancel'] as const;

 await t.test('actual SQL full state machine, committed receipts and distinct phase clients/PIDs',async()=>{
  const h=await fresh(),fence=(await db.$queryRaw<any[]>`SELECT revision::text AS f FROM ready_source_fence WHERE id=1`)[0].f;
  await h.through('completed');const rows=await h.rows();assert.equal(rows.length,6);
  assert.deepEqual(rows.map(r=>r.record.state),['sealed_ready','claimed_not_sent','send_started','delivered','completion_started','completed']);
  assert.equal(new Set(rows.map(r=>r.writer_xid)).size,6);assert.ok(rows.every(r=>String(r.fence_revision)===fence));
  const ticketHead=(await db.$queryRaw<any[]>`SELECT record_digest FROM worker_bootstrap_lifecycle_events WHERE ticket_id=${h.scope.ticketId}::uuid ORDER BY revision DESC LIMIT 1`)[0];
  assert.equal(rows[0].record.authority.ticketDigest,ticketHead.record_digest);
  assert.notEqual(rows[0].record.authority.ticketDigest,h.f.reg.identity.ticketDigest);
  const writers=h.traces.filter(r=>r.phase);assert.equal(new Set(writers.map(r=>r.pid)).size,6);assert.equal(new Set(writers.map(r=>r.client)).size,6);
  const before=await snapshot(),r=await h.factory().inspect(h.scope);assert.ok(r.ok);assert.equal(r.ok&&r.head?.state,'completed');assert.deepEqual(await snapshot(),before);
  const status=h.traces.at(-1)!;assert.ok(!writers.some(w=>w.pid===status.pid));
  const receipts=await db.$queryRaw<any[]>`SELECT r.operation_id,e.type FROM worker_bootstrap_dispatch_receipts r JOIN events e ON e.id=r.event_id JOIN worker_bootstrap_dispatch_history h ON h.id=r.operation_id WHERE h.attempt_id=${h.scope.attemptId}::uuid`;
  assert.equal(receipts.length,6);assert.ok(receipts.every(r=>r.type==='bootstrap.dispatch.write'));
  console.log(JSON.stringify({phasePids:writers.map(w=>({phase:w.phase,pid:w.pid})),statusPid:status.pid,sourceFenceUnchanged:true,attempts:1,committedTransitions:6}));
 });
 await t.test('owner recovery uses real predecessor and preserves exactly one new attempt',async()=>{
  const prior=await ticketFixture(db);await prior.store.register(prior.registration);
  await createPrismaBootstrapChannelStore(db).transition({ticketId:prior.ticket.id,operationId:randomUUID(),expectedRevision:1,action:'revoke'});
  await prior.store.transition(await prior.command('revoke'));
  const p=await prior.store.inspect({ticketId:prior.identity.ticketId});assert.ok(p.ok);if(!p.ok)throw Error('prior unavailable');
  const h=await fresh({prior:{base:prior,identity:prior.identity,head:p.head,digest:p.digest}});await h.through('completed');
  assert.equal((await h.head())!.authority.purpose,'owner_recovery');assert.equal((await h.head())!.authority.credentialEpoch,2);
 });
 await t.test('20 native independent-client claims produce exactly one committed owner',async()=>{
  const h=await fresh();await h.through('sealed_ready');const commands=await Promise.all(Array.from({length:20},()=>h.command('claim'))),start=h.traces.length;
  const results=await Promise.all(commands.map((c,i)=>h.factory(i).execute(c)));assert.equal(results.filter(r=>r.ok).length,1,JSON.stringify({results,errors:h.errors.slice(-2)}));
  assert.equal((await h.rows()).length,2);assert.equal(new Set(h.traces.slice(start).filter(r=>r.mode==='write').map(r=>r.pid)).size,20);
  assert.equal((await h.head())!.claimGeneration,1);console.log(JSON.stringify({nativeClaims:20,winners:1,writerBackendPids:20}));
 });
 await t.test('20 factory/process simulations use durable SQL and exchange/complete exactly once',async()=>{
  const h=await fresh();await h.through('claimed_not_sent');const q=await claimedInput(h);let sends=0,completes=0;
  const results=await Promise.all(Array.from({length:20},(_,i)=>createAttestedBootstrapComposition({qualification:'synthetic_durable_composition_v1',dispatch:h.factory(i),
   exchange:async()=>{sends++;assert.equal((await h.head())!.state,'send_started');return {publicSyntheticResponse:true};},
   complete:async()=>{completes++;assert.equal((await h.head())!.state,'completion_started');}}).runClaimed(q)));
  assert.equal(results.filter(r=>r.ok).length,1,JSON.stringify({results,errors:h.errors.slice(-2)}));assert.equal(sends,1);assert.equal(completes,1);
  assert.equal((await h.head())!.state,'completed');console.log(JSON.stringify({nativeFactories:20,sends,completes,processStateShared:false,realDelivery:false}));
 });
 await t.test('20 start-complete and 20 final-complete races; only exact completion is idempotent',async()=>{
  const h=await fresh();await h.through('delivered');const starts=await Promise.all(Array.from({length:20},()=>h.command('start_complete')));
  const begun=await Promise.all(starts.map((c,i)=>h.factory(i).execute(c)));assert.equal(begun.filter(r=>r.ok&&r.completionAuthorized).length,1);
  const finishes=await Promise.all(Array.from({length:20},()=>h.command('complete'))),done=await Promise.all(finishes.map((c,i)=>h.factory(i).execute(c)));
  assert.equal(done.filter(r=>r.ok).length,1);const exact=finishes[done.findIndex(r=>r.ok)],again=await h.factory().execute(exact);
  assert.equal(again.ok,true);assert.equal(again.ok&&again.idempotent,true);assert.equal(again.completionAuthorized,false);
  for(const extra of [{responseDigest:'f'.repeat(64)},{completionOperationId:randomUUID()},{operationId:randomUUID()}])assert.equal((await h.factory().execute({...exact,...extra})).ok,false);
  assert.equal((await h.rows()).length,6);
 });
 await t.test('restart before send requires expired lease and explicit new owner high water',async()=>{
  const h=await fresh();await h.through('claimed_not_sent',1500);const stale=await h.command('start_send'),owner=(await h.head())!.ownerId;
  assert.equal((await h.factory().execute(await h.command('resume'))).ok,false);await waitUntil((await h.head())!.leaseExpiresAt!);
  const r=await h.factory().execute(await h.command('resume'));assert.equal(r.ok,true,JSON.stringify(h.errors));const head=(await h.head())!;
  assert.equal(head.ownerEpoch,2);assert.equal(head.claimGeneration,2);assert.notEqual(head.ownerId,owner);
  assert.equal((await h.factory().execute(stale)).ok,false);assert.equal((await h.factory().execute(await h.command('start_send',{ownerId:owner,ownerEpoch:1,claimGeneration:1}))).ok,false);
  await h.step('start_send');
 });
 await t.test('restarts after send/unknown/completion start and lease expiry never grant another effect',async()=>{
  for(const state of ['send_started','delivery_unknown','completion_started'] as const){const h=await fresh();
   await h.through(state==='delivery_unknown'?'send_started':state,4500);if(state==='delivery_unknown')await h.step('unknown');await waitUntil((await h.head())!.leaseExpiresAt!);
   const before=await snapshot(),r=await h.factory().inspect(h.scope);assert.ok(r.ok);assert.equal(r.ok&&r.reconciliationRequired,true);
   for(const action of ['resume','start_send','start_complete','complete'] as const)assert.equal((await h.factory().execute(await h.command(action))).ok,false);
   assert.deepEqual(await snapshot(),before);assert.equal((await h.head())!.state,state);
  }
 });
 await t.test('lease expiry before send/completion and during committed readback returns no permit',async()=>{
  for(const state of ['claimed_not_sent','delivered'] as const){const h=await fresh();await h.through(state,4500);await waitUntil((await h.head())!.leaseExpiresAt!);
   assert.equal((await h.factory().execute(await h.command(state==='delivered'?'start_complete':'start_send'))).ok,false);}
  const h=await fresh();await h.through('claimed_not_sent',4500);h.controls.afterWrite=async()=>waitUntil((await h.head())!.leaseExpiresAt!);
  const r=await h.factory().execute(await h.command('start_send'));uncertain(r);assert.equal((await h.head())!.state,'send_started');
 });
 await t.test('owner/credential/host/install/decision/ticket/lifecycle/issuer/channel/fence drift blocks writers but permits audited history',async()=>{
  for(const cause of ['owner','credential','host','installation','decision','ticket','lifecycle','issuer','channel','fence']){
   const h=await fresh();await h.through('claimed_not_sent');const c=await h.command('start_send'),f=h.f;
   if(cause==='fence')await db.$executeRaw`UPDATE workspaces SET name=name WHERE id=${f.b.workspaceId}::uuid`;
   else await prepare(db,async tx=>{
    if(cause==='owner')await tx.$executeRaw`UPDATE workspace_memberships SET role='member' WHERE workspace_id=${f.b.workspaceId}::uuid AND user_id=${f.auth.ownerId}::uuid`;
    if(cause==='credential')await tx.$executeRaw`UPDATE worker_bootstrap_attempts SET record=jsonb_set(record,'{target,fingerprint}',${JSON.stringify('f'.repeat(64))}::jsonb) WHERE id=${h.scope.attemptId}::uuid`;
    if(cause==='host')await tx.$executeRaw`UPDATE agent_hosts SET status='disabled' WHERE id=${f.b.hostId}::uuid`;
    if(cause==='installation'||cause==='lifecycle')await tx.$executeRaw`UPDATE worker_identity_lifecycle SET generation=${randomUUID()}::uuid WHERE workspace_id=${f.b.workspaceId}::uuid AND kind=${cause==='installation'?'installation':'host'}`;
    if(cause==='decision')await tx.$executeRaw`UPDATE decision_revisions SET version=version+1 WHERE decision_id=${f.q.decisionId}::uuid`;
    if(cause==='ticket')await tx.$executeRaw`UPDATE worker_bootstrap_tickets SET expires_at=clock_timestamp() WHERE id=${f.q.ticketId}::uuid`;
    if(cause==='issuer')await tx.$executeRaw`UPDATE trusted_provider_ticket_keys SET epoch=epoch+1 WHERE workspace_id=${f.b.workspaceId}::uuid`;
    if(cause==='channel')await tx.$executeRaw`UPDATE worker_transport_bootstrap_grants SET record_digest=${'f'.repeat(64)} WHERE ticket_id=${f.q.ticketId}::uuid`;
   });const before=await snapshot();assert.equal((await h.factory().execute(c)).ok,false,cause);
   const status=await h.factory().inspect(h.scope);assert.ok(status.ok,cause);assert.equal(status.ok&&status.authorityCurrent,false,cause);
   assert.deepEqual(await snapshot(),before,cause);
  }
 });
 await t.test('source change held between canonical read and claim lock fails closed without append',async()=>{
  const h=await fresh();await h.through('sealed_ready');const c=await h.command('claim');let changed=false;
  h.controls.beforeWrite=async()=>{if(!changed){changed=true;await db.$executeRaw`UPDATE workspaces SET name=name WHERE id=${h.f.b.workspaceId}::uuid`;}};
  assert.equal((await h.factory().execute(c)).ok,false);assert.equal((await h.rows()).length,1);assert.equal(changed,true);
 });
 await t.test('every phase rolls back insert/precommit/deferred rejection/false ACK/connection loss with exact snapshot preservation',async()=>{
  for(const phase of phases){const {h,c}=await operation(phase),before=await snapshot(),n=(await h.rows()).length;
   for(const fault of ['insert','rollback','deferred','deferred_receipt','false','connection']){h.controls.fault=fault;const writes=h.counts().writes;
    uncertain(await h.factory().execute(c));assert.equal((await h.rows()).length,n,`${phase}:${fault}`);assert.deepEqual(await snapshot(),before,`${phase}:${fault}`);
    assert.equal(h.counts().writes,writes+1,`${phase}:${fault}`);h.clear();}
  }
 });
 await t.test('lost COMMIT acknowledgement at every phase leaves exactly one transition and never grants retry',async()=>{
  for(const phase of phases){const {h,c}=await operation(phase),n=(await h.rows()).length;h.controls.fault='lost';uncertain(await h.factory().execute(c));
   assert.equal((await h.rows()).length,n+1,phase);h.clear();const status=await h.factory().inspect(h.scope);assert.ok(status.ok);
   const repeat=await h.factory().execute(c);if(phase==='complete'){assert.ok(repeat.ok);assert.equal(repeat.ok&&repeat.idempotent,true);assert.equal(repeat.completionAuthorized,false);}
   else assert.equal(repeat.ok,false,phase);
  }
 });
 await t.test('independent readback missing/mismatch/unavailability after real COMMIT gives no permit',async()=>{
  for(const phase of ['start_send','complete'] as const)for(const fault of ['missing','mismatch','readback']){
   const {h,c}=await operation(phase),n=(await h.rows()).length;h.controls.fault=fault;uncertain(await h.factory().execute(c));assert.equal((await h.rows()).length,n+1);
   h.clear();assert.ok((await h.factory().inspect(h.scope)).ok);assert.equal((await h.factory().execute(await h.command('resume'))).ok,false);
  }
 });
 await t.test('two real response cuts after COMMIT preserve exactly one send/final-completion transition',async()=>{
  for(const phase of ['start_send','complete'] as const){const {h,c}=await operation(phase),n=(await h.rows()).length;h.controls.fault='wire';
   uncertain(await h.factory().execute(c));assert.equal((await h.rows()).length,n+1);h.clear();const before=await snapshot();
   assert.ok((await h.factory().inspect(h.scope)).ok);assert.deepEqual(await snapshot(),before);assert.equal((await h.factory().execute(await h.command('resume'))).ok,false);}
 });
 await t.test('explicit terminal reconcile/recover/cancel preserve history; expired/revoked authority cannot close it',async()=>{
  const h=await fresh();await h.through('send_started');await h.step('unknown');await h.step('require_reconciliation');
  for(const extra of [{evidenceDigest:null},{decisionId:randomUUID()},{expectedDigest:'f'.repeat(64)}])assert.equal((await h.factory().execute(await h.command('reconcile',extra))).ok,false);
  await h.step('reconcile');await h.step('recover');assert.equal((await h.head())!.state,'cancelled');assert.equal((await h.rows()).length,7);
  assert.equal((await h.factory().execute(await h.command('resume'))).ok,false);
  for(const state of ['sealed_ready','claimed_not_sent'] as const){const g=await fresh();await g.through(state);await g.step('cancel');assert.equal((await g.head())!.state,'cancelled');}
  for(const cause of ['expiry','revoke']){const g=await fresh(cause==='expiry'?{policyTtlMs:12000}:{});await g.through('send_started',cause==='expiry'?5000:30000);
   if(cause==='expiry')await waitUntil(g.f.policy.expiresAt);else assert.equal((await g.f.ports.execute(await g.f.command('terminal',{action:'revoke'}))).ok,true);
   const before=await snapshot();assert.equal((await g.factory().execute(await g.command('require_reconciliation'))).ok,false);
   const status=await g.factory().inspect(g.scope);assert.ok(status.ok);assert.equal(status.ok&&status.authorityCurrent,false);assert.deepEqual(await snapshot(),before);}
 });
 await t.test('native history/receipts/Event reject UPDATE DELETE TRUNCATE and invalid direct append',async()=>{
  const h=await fresh();await h.through('claimed_not_sent');const before=await snapshot(),rows=await h.rows(),row=rows.at(-1);
  for(const table of ['worker_bootstrap_dispatch_history','worker_bootstrap_dispatch_receipts'])for(const query of [`UPDATE ${table} SET ${table.endsWith('history')?'record_digest=record_digest':'row_digest=row_digest'}`,`DELETE FROM ${table}`,`TRUNCATE ${table} CASCADE`])
   await assert.rejects(db.$transaction(tx=>tx.$executeRawUnsafe(query),{isolationLevel:'Serializable'}));
  const receipt=(await db.$queryRaw<any[]>`SELECT event_id FROM worker_bootstrap_dispatch_receipts WHERE operation_id=${row.id}::uuid`)[0];
  await assert.rejects(db.$executeRaw`UPDATE events SET payload=payload WHERE id=${receipt.event_id}::uuid`);
  await assert.rejects(db.$executeRaw`DELETE FROM events WHERE id=${receipt.event_id}::uuid`);
  for(const extra of [{ownerEpoch:0},{claimGeneration:0},{expectedRevision:1},{expectedDigest:'f'.repeat(64)}])assert.equal((await h.factory().execute(await h.command('start_send',extra))).ok,false);
  await assert.rejects(db.$transaction(tx=>tx.$executeRaw`INSERT INTO worker_bootstrap_dispatch_history(id,attempt_id,revision,previous_digest,record,record_digest,request_digest,fence_revision,writer_xid)
   VALUES(${randomUUID()}::uuid,${h.scope.attemptId}::uuid,3,${row.record_digest},${JSON.stringify(row.record)}::jsonb,${row.record_digest},${row.request_digest},${row.fence_revision},pg_current_xact_id()::text)`,{isolationLevel:'Serializable'}));
  assert.deepEqual(await snapshot(),before);
 });
 await t.test('native guard bodies/bindings/helper pins, replica and wrong isolation deny; reads remain pure',async()=>{
  const h=await fresh();await h.through('claimed_not_sent');const before=await snapshot();
  for(const guard of dispatchGuards){await db.$executeRawUnsafe(`ALTER TABLE ${guard.table} DISABLE TRIGGER ${guard.name}`);
   try{assert.equal((await h.factory().inspect(h.scope)).ok,false,guard.name);assert.equal((await h.factory().execute(await h.command('start_send'))).ok,false);}
   finally{await db.$executeRawUnsafe(`ALTER TABLE ${guard.table} ENABLE TRIGGER ${guard.name}`);}}
  await db.$executeRawUnsafe('ALTER FUNCTION bootstrap_lifecycle_current(jsonb) SET search_path=pg_catalog');
  try{assert.equal((await h.factory().inspect(h.scope)).ok,false);}finally{await db.$executeRawUnsafe('ALTER FUNCTION bootstrap_lifecycle_current(jsonb) RESET search_path');}
  for(const setting of ["SET LOCAL session_replication_role=replica","SET TRANSACTION READ ONLY"]){h.controls.beforeWrite=async tx=>{await tx.$executeRawUnsafe(setting);};
   assert.equal((await h.factory().execute(await h.command('start_send'))).ok,false);h.clear();}
  assert.deepEqual(await snapshot(),before);assert.ok(h.traces.filter(r=>r.mode==='read').every(r=>r.sql.every(s=>!/FOR UPDATE|^(INSERT|UPDATE|DELETE)\b/.test(s))));
 });
 await t.test('pure status has no work permit; absent/copied/default dependencies and overrides deny',async()=>{
  const h=await fresh();await h.through('send_started');const before=await snapshot();for(let i=0;i<3;i++){const r=await h.factory().inspect(h.scope);assert.ok(r.ok);
   assert.equal(r.sendAuthorized,false);assert.equal(r.completionAuthorized,false);for(const key of Object.keys(lifecycleFlags))assert.equal((r as any)[key],false);}
  assert.equal((await createDurableDispatchAdapter().execute(await h.command('claim'))).ok,false);
  for(const extra of [{force:true},{endpoint:'https://invalid.example'},{authority:{}}])assert.equal((await h.factory().execute({...await h.command('claim'),...extra})).ok,false);
  assert.deepEqual(await snapshot(),before);
 });
 await t.test('synthetic exchange/completion uncertainty survives fresh factories with zero resend/recomplete',async()=>{
  for(const phase of ['exchange','complete']){const h=await fresh();await h.through('claimed_not_sent');const q=await claimedInput(h);let sends=0,completes=0;
   const deps={qualification:'synthetic_durable_composition_v1' as const,dispatch:h.factory(),exchange:async()=>{sends++;if(phase==='exchange')throw Error('synthetic response lost');return {publicResponse:true};},
    complete:async()=>{completes++;throw Error('synthetic completion response lost');}};
   assert.equal((await createAttestedBootstrapComposition(deps).runClaimed(q)).ok,false);
   assert.equal((await createAttestedBootstrapComposition({...deps,dispatch:h.factory()}).runClaimed(q)).ok,false);
   assert.equal(sends,1);assert.equal(completes,phase==='complete'?1:0);const r=await h.factory().inspect(h.scope);assert.ok(r.ok);assert.equal(r.ok&&r.reconciliationRequired,true);}
  assert.equal(effects,0);assert.equal(registrationBlocked,false);
  console.log(JSON.stringify({nativeDurableDispatchQualified:true,actualAdapter:true,independentClients:20,processSimulations:true,actualOSProcessRestart:false,
   privateKeys:0,externalDeliveryEffects:effects,defaultComposition:false,...lifecycleFlags}));
 });
});
