import test from 'node:test';import assert from 'node:assert/strict';import crypto,{randomUUID} from 'node:crypto';
import net from 'node:net';import tls from 'node:tls';import http from 'node:http';import https from 'node:https';import dns from 'node:dns';import childProcess from 'node:child_process';
import {PrismaClient} from '@prisma/client';
import {ticketFixture,owned,prepare,hash,type Db} from './bootstrap-ticket-native-fixture';
import {createPrismaTicketLifecycleStore,TicketLifecycleUnknown} from '../modules/api-keys/bootstrap-ticket-lifecycle-store';
import {createPrismaBootstrapChannelStore,inspectCanonicalBootstrapChannel} from '../modules/api-keys/bootstrap-channel-store';
import {ticketGuards,ticketHelpers,ticketChannelHelper} from '../modules/api-keys/bootstrap-ticket-lifecycle-guards';
import {reviewDigest} from '../modules/agent-runtime/task-review-contract';
import {lifecycleFlags} from '../modules/api-keys/bootstrap-ticket-lifecycle-contract';
import {ticketChannelPlanDigest,ticketContentDigest,ticketEnvelopeDigest} from '../modules/api-keys/bootstrap-ticket-v2-digests';
import {createCanonicalBootstrapAuthoritySource,CanonicalBootstrapBlocked} from '../modules/api-keys/worker-bootstrap-authority-source';
const enabled=process.env.WORKER_IDENTITY_NATIVE_DATABASE;
test('atomic v2 ticket channel native qualification',{skip:!enabled,timeout:850000},async t=>{
 const db=new PrismaClient();await db.$connect();t.after(()=>db.$disconnect());await owned(db);
 let effects=0;const forbid=()=>{effects++;throw Error('non-database effect forbidden');};
 for(const m of ['connect','createConnection'] as const)t.mock.method(net,m,forbid);t.mock.method(net.Server.prototype,'listen',forbid);t.mock.method(tls,'connect',forbid);
 for(const module of [http,https])for(const m of ['request','get'] as const)t.mock.method(module,m,forbid);
 for(const m of ['lookup','resolve','resolve4','resolve6'] as const){t.mock.method(dns,m,forbid);t.mock.method(dns.promises,m,forbid);}
 t.mock.method(globalThis,'fetch',forbid);for(const m of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'] as const)t.mock.method(childProcess,m,forbid);
 for(const m of ['generateKeyPair','generateKeyPairSync','createPrivateKey','sign'] as const)t.mock.method(crypto,m,forbid);
 const logs:unknown[]=[];for(const m of ['log','warn','error'] as const)t.mock.method(console,m,(...v:unknown[])=>logs.push(v));
 const tables=['worker_bootstrap_tickets','worker_bootstrap_attempts','worker_bootstrap_history','worker_bootstrap_heads','worker_bootstrap_audit','worker_bootstrap_lifecycle_events','worker_bootstrap_write_receipts','worker_transport_generations','worker_transport_history','worker_transport_heads','worker_transport_audit','worker_transport_bootstrap_grants','worker_transport_write_audit','ready_source_fence','events'];
 async function snapshot(){const rows=[];for(const table of tables)rows.push(await db.$queryRawUnsafe(`SELECT count(*)::int AS count,md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY to_jsonb(t)::text),'')) AS digest FROM ${table} t`));return rows;}
 const unknown=(e:any)=>e instanceof TicketLifecycleUnknown&&e.code==='reconciliation_required'&&e.retryable===false;
 async function issue(f:Awaited<ReturnType<typeof ticketFixture>>){try{return await f.store.register(f.registration);}catch{assert.fail('Native ticket issue failed: '+JSON.stringify(f.errors));}}
 async function count(f:Awaited<ReturnType<typeof ticketFixture>>){return (await db.$queryRaw<any[]>`SELECT (SELECT count(*)::int FROM worker_bootstrap_tickets WHERE id=${f.ticket.id}::uuid) AS roots,(SELECT count(*)::int FROM worker_transport_bootstrap_grants WHERE ticket_id=${f.ticket.id}::uuid) AS grants,(SELECT count(*)::int FROM worker_bootstrap_lifecycle_events WHERE ticket_id=${f.ticket.id}::uuid) AS receipts`)[0];}
 const smoke=await ticketFixture(db);await issue(smoke);assert.ok((await smoke.inspect()).ok);
 await db.$executeRawUnsafe("CREATE FUNCTION native_ticket_fail() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic native failure'; END $$");
 await db.$executeRawUnsafe("CREATE FUNCTION native_ticket_late_fail() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(0.1); RAISE EXCEPTION 'synthetic late failure'; END $$");
 await t.test('migration 82 preserves legacy rows and prior CHECK expressions without admitting legacy tickets',async()=>{
  const saved=await db.$queryRaw<any[]>`SELECT kind,body FROM native_ticket_preflight`;
  for(const row of saved.filter(r=>r.kind!=='checks'))for(const old of row.body){assert.deepEqual((await db.$queryRawUnsafe<any[]>(`SELECT to_jsonb(t)-ARRAY['lifecycle_identity','lifecycle_version'] AS value FROM ${row.kind} t WHERE id='${old.id}'`))[0].value,old);}
  for(const old of saved.find(r=>r.kind==='checks').body){const expr=(await db.$queryRaw<any[]>`SELECT pg_get_expr(conbin,conrelid) AS expr FROM pg_constraint WHERE conname=${old.name} AND conrelid=${old.table}::regclass`)[0].expr;assert.ok(expr===old.expr||expr.includes(old.expr),old.name);}
  const old=saved.find(r=>r.kind==='worker_bootstrap_tickets').body[0];assert.equal((await smoke.store.inspect({ticketId:old.id})).ok,false);
 });
 await t.test('root channel and issue have one xid, exact digests and strictly increasing receipt fences; reserve consume succeed',async()=>{
  const f=await ticketFixture(db);await issue(f);
  const proof=await db.$queryRaw<any[]>`SELECT bootstrap_lifecycle_channel_bound(lifecycle_identity) AS bound,bootstrap_lifecycle_current(lifecycle_identity) AS current FROM worker_bootstrap_tickets WHERE id=${f.ticket.id}::uuid`;assert.deepEqual(proof,[{bound:true,current:true}]);
  const receipts=await db.$queryRaw<any[]>`SELECT table_name,writer_xid,fence_revision::text AS fence FROM worker_bootstrap_write_receipts WHERE ticket_id=${f.ticket.id}::uuid UNION ALL SELECT table_name,writer_xid,fence_revision::text FROM worker_transport_write_audit WHERE generation_id=${f.snapshot.generation}::uuid`;
  assert.equal(new Set(receipts.map(r=>r.writer_xid)).size,1);
  const ordered=['worker_bootstrap_tickets','worker_transport_generations','worker_transport_bootstrap_grants','worker_transport_history','worker_bootstrap_lifecycle_events'].map(n=>BigInt(receipts.find(r=>r.table_name===n).fence));assert.ok(ordered.every((v,n)=>!n||v>ordered[n-1]));
  assert.deepEqual(await count(f),{roots:1,grants:1,receipts:1});await f.store.transition(await f.command('reserve'));await f.store.transition(await f.command('consume'));
  assert.deepEqual(await count(f),{roots:1,grants:1,receipts:3});assert.equal((await db.$queryRaw<any[]>`SELECT count(*)::int AS n FROM worker_bootstrap_attempts WHERE ticket_id=${f.ticket.id}::uuid`)[0].n,1);
 });
 await t.test('native digest domains match canonical source and malformed content envelope plan v1 and override inputs deny',async()=>{
  const f=await ticketFixture(db),c=f.registration;
  const domains=[{domain:'worker-bootstrap-channel-plan-v2',snapshot:f.snapshot},{domain:'worker-bootstrap-ticket-content-v2',payload:c.record.signed.payload},{domain:'worker-bootstrap-ticket-envelope-v2',signed:c.record.signed}];
  const expected=[ticketChannelPlanDigest(f.snapshot),ticketContentDigest(c.record.signed.payload),ticketEnvelopeDigest(c.record.signed)];
  for(let n=0;n<domains.length;n++)assert.equal((await db.$queryRaw<any[]>`SELECT bootstrap_lifecycle_digest(${JSON.stringify(domains[n])}::jsonb) AS digest`)[0].digest,expected[n]);assert.equal(new Set(expected).size,3);
  assert.ok(!('ticketDigest' in c.record.signed.payload.lifecycle));assert.ok(!('ticketDigest' in f.snapshot));
  const bad=structuredClone(c);bad.record.signed.payload.ownerId=randomUUID();const envelope=structuredClone(c);envelope.record.signed.signature='1'.repeat(128);
  const plan=structuredClone(c);plan.identity.channelDigest=hash('0');const v1=structuredClone(c) as any;v1.record.signed.payload.version='worker-bootstrap-owner-ticket-v1';
  const before=await snapshot();for(const input of [bad,envelope,plan,v1,{...c,url:'override'}])await assert.rejects(f.store.register(input));assert.deepEqual(await snapshot(),before);
  await prepare(db,tx=>tx.$executeRaw`UPDATE decision_revisions SET body=jsonb_set(body,'{workerBootstrapChannel,snapshot,caDigest}',${JSON.stringify(hash('0'))}::jsonb) WHERE decision_id=${f.accepted.decisionId}::uuid`);
  const drift=await snapshot();await assert.rejects(f.store.register(c));assert.deepEqual(await snapshot(),drift);
 });
 await t.test('missing verifier binder and signature refusal cannot write; v2 standalone grant and late binding refuse',async()=>{
  const f=await ticketFixture(db);const before=await snapshot();
  for(const deps of [undefined,{channel:f.deps.channel},{verifier:f.deps.verifier}])await assert.rejects(createPrismaTicketLifecycleStore(f.client,()=>new Date(),deps as any).register(f.registration));
  assert.equal(f.attempts.writes,0);f.fault('signature');await assert.rejects(f.store.register(f.registration));assert.equal(f.attempts.roots,0);assert.deepEqual(await snapshot(),before);f.fault('');await issue(f);
  const bound=await snapshot();await assert.rejects(createPrismaBootstrapChannelStore(db).grant({ticketId:f.ticket.id,decisionId:f.accepted.decisionId,decisionRevision:1,operationId:randomUUID()}));
  await assert.rejects(db.$transaction(tx=>f.deps.channel.bind(tx,f.registration,new Date()),{isolationLevel:'Serializable'}));assert.deepEqual(await snapshot(),bound);
 });
 await t.test('rollback every write phase leaves no ticket channel generation history head audit Event or fence',async()=>{
  for(const fault of ['root','generation','grant','history','issue','precommit','head','audit','event','receipt','fence']){const f=await ticketFixture(db),before=await snapshot();
   const table=({head:'worker_transport_heads',audit:'worker_transport_audit',event:'events',receipt:'worker_bootstrap_write_receipts',fence:'ready_source_fence'} as any)[fault];
   if(table)f.before(tx=>tx.$executeRawUnsafe(`CREATE TRIGGER native_ticket_phase_failure AFTER ${fault==='fence'?'UPDATE':'INSERT'} ON ${table} FOR EACH ROW EXECUTE FUNCTION native_ticket_fail()`).then(()=>{}));else f.fault(fault);
   await assert.rejects(f.store.register(f.registration));assert.deepEqual(await snapshot(),before,fault);assert.equal(f.attempts.writes,1);assert.deepEqual(await count(f),{roots:0,grants:0,receipts:0});
  }
 });
 await t.test('twenty concurrent issue and bind transactions yield one winner and one generation without retries',async()=>{
  const f=await ticketFixture(db),results=await Promise.allSettled(Array.from({length:20},()=>f.store.register({...f.registration,operationId:randomUUID()})));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.deepEqual(await count(f),{roots:1,grants:1,receipts:1});assert.equal(f.attempts.writes,20);
  assert.equal((await db.$queryRaw<any[]>`SELECT count(*)::int AS n FROM worker_transport_generations WHERE id=${f.snapshot.generation}::uuid`)[0].n,1);
 });
 await t.test('deferred and late COMMIT rejection return non-retryable reconciliation with complete rollback',async()=>{
  for(const late of [false,true]){const f=await ticketFixture(db),before=await snapshot();
   f.before(tx=>tx.$executeRawUnsafe(`CREATE CONSTRAINT TRIGGER native_ticket_commit_failure AFTER INSERT ON worker_bootstrap_lifecycle_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ${late?'native_ticket_late_fail':'native_ticket_fail'}()`).then(()=>{}));
   await assert.rejects(f.store.register(f.registration),unknown);assert.deepEqual(await snapshot(),before);assert.equal(f.attempts.writes,1);assert.equal(f.attempts.issues,1);
  }
 });
 await t.test('real connection loss before COMMIT is reconciliation and leaves no committed operation',async()=>{
  const f=await ticketFixture(db),before=await snapshot();f.fault('connection');await assert.rejects(f.store.register(f.registration),unknown);assert.deepEqual(await snapshot(),before);assert.equal(f.attempts.writes,1);
 });
 await t.test('response cut after actual COMMIT returns reconciliation and leaves exactly one committed operation',async()=>{
  const f=await ticketFixture(db);f.before(tx=>tx.$queryRawUnsafe("SELECT 'native_drop_commit_response'").then(()=>{}));await assert.rejects(f.store.register(f.registration),unknown);assert.deepEqual(await count(f),{roots:1,grants:1,receipts:1});assert.equal(f.attempts.writes,1);
 });
 await t.test('separate post-COMMIT readback failure is reconciliation without replay',async()=>{
  const f=await ticketFixture(db);f.fault('readback');await assert.rejects(f.store.register(f.registration),unknown);assert.deepEqual(await count(f),{roots:1,grants:1,receipts:1});assert.equal(f.attempts.writes,1);f.fault('');assert.ok((await f.inspect()).ok);
 });
 await t.test('READ ONLY inspect and status are pure and flags remain false',async()=>{
  const f=await ticketFixture(db);await issue(f);const before=await snapshot();for(let n=0;n<3;n++){const p=await f.inspect();assert.ok(p.ok);if(p.ok){assert.ok(p.usable);for(const k of Object.keys(lifecycleFlags))assert.equal((p as any)[k],false);}}
  assert.deepEqual(await snapshot(),before);assert.ok(f.modes.length>=4&&f.modes.every(v=>v==='on'));
 });
 await t.test('before full binding there is no channel admission or consume; missing issue cannot commit',async()=>{
  for(const phase of ['root','binding']){const f=await ticketFixture(db),before=await snapshot();let checked=false;
   f.afterQuery(async(tx,sql)=>{if(checked||!(phase==='root'?sql.startsWith('INSERT INTO worker_bootstrap_tickets'):sql.startsWith('WITH v AS')))return;checked=true;
    assert.equal((await inspectCanonicalBootstrapChannel(tx,f.ticket.id)).facts,null);
    await tx.$executeRaw`SAVEPOINT native_incomplete`;
    const a={id:randomUUID(),ticketId:f.ticket.id,ticketDigest:f.identity.ticketDigest,decisionId:f.ticket.decisionId,requestId:f.ticket.intent.requestId,binding:f.b,target:f.ticket.intent.target,state:'consumed',expiresAt:f.identity.expiresAt};
    await assert.rejects(tx.$executeRaw`INSERT INTO worker_bootstrap_attempts(id,ticket_id,workspace_id,host_id,generation,credential_epoch,predecessor_id,record,record_digest,lifecycle_version) VALUES(${a.id}::uuid,${f.ticket.id}::uuid,${f.b.workspaceId}::uuid,${f.b.hostId}::uuid,1,1,NULL,${JSON.stringify(a)}::jsonb,${reviewDigest(a)},'bootstrap-ticket-revocation-proposal-v1')`,(e:any)=>e.meta?.message?.includes('bootstrap_attempt_source_stale'));
    await tx.$executeRaw`ROLLBACK TO SAVEPOINT native_incomplete`;throw Error('incomplete rollback');
   });await assert.rejects(f.store.register(f.registration));assert.ok(checked);assert.deepEqual(await snapshot(),before);
  }
  const f=await ticketFixture(db);await issue(f);await prepare(db,tx=>tx.$executeRaw`DELETE FROM worker_bootstrap_lifecycle_events WHERE ticket_id=${f.ticket.id}::uuid`);const before=await snapshot();assert.equal((await f.inspect()).ok,false);
  await assert.rejects(f.store.transition({ticketId:f.ticket.id,operationId:randomUUID(),expectedRevision:1,expectedFence:'1',action:'consume'}));assert.deepEqual(await snapshot(),before);
 });
 await t.test('all 89 catalog guards deny disabled definitions and selected body tampering; restoration returns readable state',async()=>{
  const f=await ticketFixture(db);await issue(f);assert.equal(ticketGuards.length,89);
  for(const g of ticketGuards){await db.$executeRawUnsafe(`ALTER TABLE ${g.table} DISABLE TRIGGER ${g.name}`);try{assert.equal((await f.inspect()).ok,false,g.name);}finally{await db.$executeRawUnsafe(`ALTER TABLE ${g.table} ENABLE TRIGGER ${g.name}`);}}
  const name='bootstrap_lifecycle_write_guard',original=(await db.$queryRaw<any[]>`SELECT pg_get_functiondef(oid) AS body FROM pg_proc WHERE proname=${name}`)[0].body;
  await db.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION ${name}() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$`);try{assert.equal((await f.inspect()).ok,false);}finally{await db.$executeRawUnsafe(original);}
  assert.ok((await f.inspect()).ok);
 });
 await t.test('all seven helper fingerprints reject body or configuration tampering',async()=>{
  const f=await ticketFixture(db);await issue(f);const helpers=[...ticketHelpers,ticketChannelHelper];assert.equal(helpers.length,7);
  for(const h of helpers){const original=(await db.$queryRaw<any[]>`SELECT pg_get_functiondef(oid) AS body FROM pg_proc WHERE proname=${h.name}`)[0].body;
   await db.$executeRawUnsafe(`ALTER FUNCTION ${h.name}(jsonb) SET search_path=pg_catalog`);try{assert.equal((await f.inspect()).ok,false,h.name);}finally{await db.$executeRawUnsafe(original);}}
  assert.ok((await f.inspect()).ok);
 });
 await t.test('replica and incomplete receipts deny without repair or source writes',async()=>{
  const f=await ticketFixture(db);await issue(f);const before=await snapshot();f.before(tx=>tx.$executeRaw`SET LOCAL session_replication_role=replica`.then(()=>{}));assert.equal((await f.inspect()).ok,false);assert.deepEqual(await snapshot(),before);
  const reserve=await f.command('reserve');f.before(tx=>tx.$executeRaw`SET LOCAL session_replication_role=replica`.then(()=>{}));await assert.rejects(f.store.transition(reserve));assert.deepEqual(await snapshot(),before);
  await prepare(db,tx=>tx.$executeRaw`DELETE FROM worker_bootstrap_write_receipts WHERE ticket_id=${f.ticket.id}::uuid`);const damaged=await snapshot();assert.equal((await f.inspect()).ok,false);assert.deepEqual(await snapshot(),damaged);
 });
 await t.test('canonical authority keeps both blockers, public-only data and zero forbidden effects',async()=>{
  const f=await ticketFixture(db);await issue(f);const source=createCanonicalBootstrapAuthoritySource(()=>new Date());
  await db.$transaction(async tx=>{await tx.$executeRaw`SET TRANSACTION READ ONLY`;const release=await source.bindTransaction!(tx,'read');try{await assert.rejects(source.context(tx,f.b,f.ticket.issuedAt,f.ticket.id),(e:any)=>e instanceof CanonicalBootstrapBlocked&&JSON.stringify(e.blockers)===JSON.stringify(['bootstrap_ticket_revocation_unavailable','signed_current_decision_unavailable']));}finally{release();}},{isolationLevel:'RepeatableRead'});
  assert.equal(effects,0);assert.deepEqual(logs,[]);assert.ok(!JSON.stringify(f.registration).includes('PRIVATE KEY'));
 });
});
