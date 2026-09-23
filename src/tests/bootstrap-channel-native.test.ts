import test from 'node:test';import assert from 'node:assert/strict';import crypto,{randomUUID} from 'node:crypto';
import net from 'node:net';import tls from 'node:tls';import http from 'node:http';import https from 'node:https';import dns from 'node:dns';import childProcess from 'node:child_process';
import {PrismaClient} from '@prisma/client';
import {channelFixture,ordinaryFixture,owned,prepare,hash,type Db} from './bootstrap-channel-native-fixture';
import {inspectCanonicalBootstrapChannel,ChannelReconciliationRequired} from '../modules/api-keys/bootstrap-channel-store';
import {channelGuards} from '../modules/api-keys/bootstrap-channel-guards';
import {createCanonicalBootstrapAuthoritySource,CanonicalBootstrapBlocked} from '../modules/api-keys/worker-bootstrap-authority-source';
const enabled=process.env.WORKER_IDENTITY_NATIVE_DATABASE;
test('canonical bootstrap channel native qualification',{skip:!enabled,timeout:850000},async t=>{
 const db=new PrismaClient();await db.$connect();t.after(()=>db.$disconnect());await owned(db);
 let effects=0;const forbid=()=>{effects++;throw Error('non-database effect forbidden');};
 for(const m of ['connect','createConnection'] as const)t.mock.method(net,m,forbid);t.mock.method(net.Server.prototype,'listen',forbid);t.mock.method(tls,'connect',forbid);
 for(const module of [http,https])for(const m of ['request','get'] as const)t.mock.method(module,m,forbid);
 for(const m of ['lookup','resolve','resolve4','resolve6'] as const){t.mock.method(dns,m,forbid);t.mock.method(dns.promises,m,forbid);}
 t.mock.method(globalThis,'fetch',forbid);for(const m of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'] as const)t.mock.method(childProcess,m,forbid);
 for(const m of ['generateKeyPair','generateKeyPairSync','createPrivateKey','sign'] as const)t.mock.method(crypto,m,forbid);
 const logs:unknown[]=[];for(const m of ['log','warn','error'] as const)t.mock.method(console,m,(...v:unknown[])=>logs.push(v));
 const tables=['worker_transport_generations','worker_transport_history','worker_transport_heads','worker_transport_audit','worker_transport_bootstrap_grants','worker_transport_write_audit','ready_source_fence','events'];
 async function snapshot(){const rows=[];for(const table of tables)rows.push(await db.$queryRawUnsafe(`SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb) AS value FROM ${table} t`));return rows;}
 async function probe(work:(tx:Db)=>Promise<void>){const stop=Error('owned rollback');await assert.rejects(db.$transaction(async tx=>{await work(tx);throw stop;},{isolationLevel:'Serializable',timeout:30000}),e=>e===stop);}
 const grant=async(f:Awaited<ReturnType<typeof channelFixture>>)=>{try{return await f.store.grant(f.command());}catch{assert.fail('native channel grant failed: '+JSON.stringify(f.errors));}};
 // Stop before the expensive matrix if the positive path is not native-valid.
 const smoke=await channelFixture(db);await grant(smoke);assert.deepEqual((await smoke.store.inspect(smoke.ticket.id)).blockers,[]);
 await t.test('pre-migration ordinary rows and all old ordinary CHECK expressions remain unchanged',async()=>{
  const saved=await db.$queryRaw<any[]>`SELECT kind,body FROM native_channel_preflight`;
  for(const row of saved.filter(r=>r.kind!=='checks'))for(const old of row.body){const key=row.kind==='worker_transport_heads'?`workspace_id='${old.workspace_id}' AND host_id='${old.host_id}'`:row.kind==='worker_transport_audit'?`history_id='${old.history_id}'`:`id='${old.id}'`;
   assert.deepEqual((await db.$queryRawUnsafe<any[]>(`SELECT to_jsonb(t)-ARRAY['purpose','writer_xid'] AS value FROM ${row.kind} t WHERE ${key}`))[0].value,old);}
  const checks=saved.find(r=>r.kind==='checks').body;
  for(const old of checks){const current=(await db.$queryRaw<any[]>`SELECT pg_get_expr(conbin,conrelid) AS expr FROM pg_constraint WHERE conname=${old.name} AND conrelid=${old.table}::regclass`)[0].expr;
   assert.ok(current===old.expr||current.includes(old.expr),old.name);}
  const f=await ordinaryFixture(db),missingCredential=randomUUID();for(const patch of [{credentialId:null},{credentialId:missingCredential,identity:{...f.identity,credentialId:missingCredential}},{identity:{...f.identity,purpose:'first_enrollment'}},{record:{...f.record,unexpected:true}}])await assert.rejects(db.$transaction(tx=>f.direct(tx,patch),{isolationLevel:'Serializable'}));
 });
 await t.test('first enrollment and recovery share canonical history/head; consume is single-use and close terminal',async()=>{
  for(const purpose of ['first_enrollment','owner_recovery'] as const){const f=await channelFixture(db,purpose);await grant(f);const original=(await db.$queryRaw<any[]>`SELECT record FROM worker_transport_bootstrap_grants WHERE ticket_id=${f.ticket.id}::uuid`)[0].record;
   await f.store.transition(await f.transition());assert.ok((await f.store.inspect(f.ticket.id)).blockers.length);await assert.rejects(f.store.transition(await f.transition()));await f.store.transition(await f.transition('close'));await assert.rejects(f.store.transition(await f.transition('close')));
   assert.deepEqual((await db.$queryRaw<any[]>`SELECT record FROM worker_transport_bootstrap_grants WHERE ticket_id=${f.ticket.id}::uuid`)[0].record,original);
   assert.deepEqual(await db.$queryRaw<any[]>`SELECT count(*)::int AS n,bool_and(credential_id IS NULL) AS no_credential FROM worker_transport_generations WHERE workspace_id=${f.b.workspaceId}::uuid`,[{n:1,no_credential:true}]);}
 });
 await t.test('exact owner/decision/ticket/lifecycle/issuer bindings deny drift with zero effects',async()=>{
  for(const mode of ['owner','decision','ticket','host','installation','issuer','ca','pin','origin']){const f=await channelFixture(db);if(mode==='owner')await prepare(db,tx=>tx.workspaceMembership.update({where:{workspaceId_userId:{workspaceId:f.b.workspaceId,userId:f.ticket.ownerId}},data:{role:'member'}}));
   else if(mode==='decision')await prepare(db,async tx=>{const other=await tx.user.create({data:{email:randomUUID()+'@example.test',passwordHash:'inert-not-a-login'}});await tx.$executeRaw`UPDATE decision_acceptances SET actor_user_id=${other.id}::uuid WHERE decision_id=${f.accepted.decisionId}::uuid`;});
   else await f.changeIntent(i=>{if(mode==='ticket')i.ticketDigest=hash('0');if(mode==='host')i.snapshot.hostGeneration=randomUUID();if(mode==='installation')i.snapshot.installationGeneration=randomUUID();if(mode==='issuer')i.snapshot.issuerHistoryDigest=hash('0');if(mode==='ca')i.snapshot.caDigest=hash('0');if(mode==='pin')i.snapshot.leafPin=hash('0');if(mode==='origin'){i.snapshot.origin='https://other.example.com:443';i.snapshot.serverName='other.example.com';}});
   const before=await snapshot();await assert.rejects(f.store.grant(f.command()));assert.deepEqual(await snapshot(),before);}
 });
 await t.test('expiry/cutover/revoke/unknown are terminal and replay never appends',async()=>{
  for(const mode of ['expiry','cutover','revoke','unknown']){const f=await channelFixture(db);if(mode==='cutover')await f.changeIntent(i=>i.snapshot.cutoverAt=f.iso(1000));await grant(f);
   if(mode==='revoke')await f.store.transition(await f.transition('revoke'));else if(mode==='unknown'){await f.store.transition(await f.transition());await f.store.transition(await f.transition('unknown'));}else f.at(mode==='expiry'?110000:1000);
   const before=await snapshot();await assert.rejects(f.store.transition(await f.transition()));await assert.rejects(f.store.grant(f.command()));assert.deepEqual(await snapshot(),before);
   if(mode==='revoke'){const op=randomUUID();await assert.rejects(db.$transaction(tx=>tx.$executeRaw`INSERT INTO worker_transport_history(id,workspace_id,host_id,generation_id,revision,record_digest,previous_revision,previous_digest,previous_high_water,previous_state,previous_generation_id,certificate_epoch,high_water_epoch,state,request_id,decision_id,decision_revision,decision_intent_digest,owner_id,current_pin,record,signature,purpose) SELECT ${op}::uuid,h.workspace_id,h.host_id,h.generation_id,h.revision+1,h.record_digest,h.revision,h.record_digest,h.high_water_epoch,h.state,h.generation_id,h.certificate_epoch,h.high_water_epoch,'current',${op}::uuid,g.decision_id,h.decision_revision,h.decision_intent_digest,h.owner_id,h.current_pin,jsonb_build_object('id',${op},'grantId',g.id,'revision',h.revision+1,'previousId',h.id,'action','grant','state','current','at',CURRENT_TIMESTAMP),NULL,h.purpose FROM worker_transport_history h JOIN worker_transport_heads head ON head.history_id=h.id JOIN worker_transport_bootstrap_grants g ON g.generation_id=h.generation_id WHERE h.workspace_id=${f.b.workspaceId}::uuid`,{isolationLevel:'Serializable'}),(e:any)=>e.meta?.message?.includes('bootstrap_grant_replay'));}
  }
 });
 await t.test('existing ordinary runtime writer retains active-credential context and native fence/audit',async()=>{
  const f=await ordinaryFixture(db);await f.runtime();assert.deepEqual(await db.$queryRaw<any[]>`SELECT count(*)::int AS n FROM worker_transport_write_audit WHERE generation_id=(SELECT id FROM worker_transport_generations WHERE workspace_id=${f.b.workspaceId}::uuid)`,[{n:4}]);
  await prepare(db,tx=>tx.apiKey.update({where:{id:f.identity.credentialId},data:{active:false,revokedAt:new Date()}}));
  await f.store.read!(async tx=>{assert.equal((await tx.context(f.b.workspaceId,f.b.hostId))!.credentialActive,false);});
  const ordinary=await ordinaryFixture(db);await db.$transaction(tx=>ordinary.direct(tx),{isolationLevel:'Serializable'});
  assert.equal((await db.$queryRaw<any[]>`SELECT count(*)::int AS n FROM worker_transport_write_audit WHERE generation_id=${ordinary.generationId}::uuid`)[0].n,4);
 });
 await t.test('direct SQL and fixture mutations cannot omit atomic head/audit or mutate immutable rows',async()=>{
  const f=await channelFixture(db);await grant(f);const before=await snapshot();
  for(const table of ['worker_transport_generations','worker_transport_history','worker_transport_bootstrap_grants','worker_transport_audit','worker_transport_write_audit']){
   await assert.rejects(db.$transaction(tx=>tx.$executeRawUnsafe(`DELETE FROM ${table}`),{isolationLevel:'Serializable'}));await assert.rejects(db.$executeRawUnsafe(`TRUNCATE ${table} CASCADE`));}
  await assert.rejects(db.$transaction(tx=>tx.$executeRaw`UPDATE worker_transport_heads SET purpose=NULL WHERE workspace_id=${f.b.workspaceId}::uuid`,{isolationLevel:'Serializable'}));
  assert.deepEqual(await snapshot(),before);
  const orphan=await ordinaryFixture(db);const beforeOrphan=await snapshot();
  // Prisma 5 can acknowledge a deferred COMMIT failure; inspect durable outcome.
  await db.$transaction(tx=>tx.$executeRaw`INSERT INTO worker_transport_generations(id,workspace_id,host_id,installation_id,credential_id,identity,identity_digest) VALUES(${orphan.generationId}::uuid,${orphan.b.workspaceId}::uuid,${orphan.b.hostId}::uuid,${orphan.b.installationId}::uuid,${orphan.identity.credentialId}::uuid,${JSON.stringify(orphan.identity)}::jsonb,${hash('a')})`,{isolationLevel:'Serializable'}).catch(()=>{});
  assert.deepEqual(await snapshot(),beforeOrphan);
 });
 await t.test('twenty concurrent grants and twenty concurrent consumes each have exactly one durable winner',async()=>{
  const f=await channelFixture(db),commands=Array.from({length:20},()=>f.command()),r=await Promise.allSettled(commands.map(c=>f.store.grant(c)));assert.equal(r.filter(v=>v.status==='fulfilled').length,1);
  const transitions=await Promise.all(Array.from({length:20},()=>f.transition())),c=await Promise.allSettled(transitions.map(v=>f.store.transition(v)));assert.equal(c.filter(v=>v.status==='fulfilled').length,1);
  assert.deepEqual(await db.$queryRaw<any[]>`SELECT count(*)::int AS n FROM worker_transport_history WHERE workspace_id=${f.b.workspaceId}::uuid`,[{n:2}]);assert.equal(f.attempts.writes,40);
 });
 await db.$executeRawUnsafe("CREATE OR REPLACE FUNCTION native_channel_fail() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic native failure'; END $$");
 await db.$executeRawUnsafe("CREATE OR REPLACE FUNCTION native_channel_late_fail() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(0.1); RAISE EXCEPTION 'synthetic late failure'; END $$");
 await t.test('rollback covers generation/grant/history/head/audit/Event/fence at every write phase',async()=>{
  for(const fault of ['fence','generation','grant','append','precommit','history','head','audit']){const f=await channelFixture(db),before=await snapshot();
   if(['history','head','audit'].includes(fault)){const table=fault==='history'?'worker_transport_history':fault==='head'?'worker_transport_heads':'worker_transport_audit';f.before(tx=>tx.$executeRawUnsafe(`CREATE TRIGGER native_channel_phase_failure AFTER INSERT ON ${table} FOR EACH ROW EXECUTE FUNCTION native_channel_fail()`).then(()=>{}));}else f.fault(fault);
   await assert.rejects(f.store.grant(f.command()));assert.deepEqual(await snapshot(),before,fault);assert.equal(f.attempts.writes,1);}
 });
 await t.test('deferred and late COMMIT rejection are unknown non-retryable and leave no durable write',async()=>{
  for(const late of [false,true]){const f=await channelFixture(db),before=await snapshot();f.before(tx=>tx.$executeRawUnsafe(`CREATE CONSTRAINT TRIGGER native_channel_commit_failure AFTER INSERT ON worker_transport_history DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ${late?'native_channel_late_fail':'native_channel_fail'}()`).then(()=>{}));
   await assert.rejects(f.store.grant(f.command()),(e:any)=>e instanceof ChannelReconciliationRequired&&e.deliveryUnknown&&!e.retryable);assert.deepEqual(await snapshot(),before);assert.deepEqual(f.attempts,{writes:1,appends:1});}
 });
 await t.test('real connection loss before COMMIT reports unknown without retry or durable rows',async()=>{
  const f=await channelFixture(db),before=await snapshot();f.fault('connection');await assert.rejects(f.store.grant(f.command()),ChannelReconciliationRequired);assert.deepEqual(await snapshot(),before);assert.deepEqual(f.attempts,{writes:1,appends:1});
 });
 await t.test('lost response after real COMMIT leaves one operation but requires reconciliation',async()=>{
  const f=await channelFixture(db);f.before(tx=>tx.$queryRawUnsafe("SELECT 'native_drop_commit_response'").then(()=>{}));await assert.rejects(f.store.grant(f.command()),(e:any)=>e instanceof ChannelReconciliationRequired&&e.deliveryUnknown&&!e.retryable);
  assert.deepEqual(f.attempts,{writes:1,appends:1});assert.deepEqual(await db.$queryRaw<any[]>`SELECT count(*)::int AS n FROM worker_transport_history WHERE workspace_id=${f.b.workspaceId}::uuid`,[{n:1}]);
 });
 await t.test('all 47 guards reject missing/disabled/rebound/body/config/column/predicate tampering',async()=>{
  const f=await channelFixture(db);await grant(f);let cases=0;
  for(const g of channelGuards)for(const mode of ['missing','disabled','rebound','body','config','column','predicate']){
   await probe(async tx=>{const ddl=mode==='missing'?`DROP TRIGGER ${g.name} ON ${g.table}`:mode==='disabled'?`ALTER TABLE ${g.table} DISABLE TRIGGER ${g.name}`:mode==='rebound'?`ALTER FUNCTION ${g.function}() RENAME TO native_rebound_channel`:mode==='body'?`CREATE OR REPLACE FUNCTION ${g.function}() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$`:mode==='config'?`ALTER FUNCTION ${g.function}() SET search_path=pg_catalog`:null;
    if(ddl)await tx.$executeRawUnsafe(ddl);else {
     if(mode==='predicate')await tx.$executeRawUnsafe('CREATE TRIGGER native_predicate BEFORE INSERT ON ready_source_fence FOR EACH ROW WHEN (true) EXECUTE FUNCTION native_channel_fail()');
     await tx.$executeRawUnsafe(`UPDATE pg_trigger SET ${mode==='column'?"tgattr='1'::int2vector":"tgqual=(SELECT tgqual FROM pg_trigger WHERE tgname='native_predicate')"} WHERE tgrelid='${g.table}'::regclass AND tgname='${g.name}'`);
    }
    assert.ok((await inspectCanonicalBootstrapChannel(tx,f.ticket.id,f.now())).blockers.length);cases++;
   });
  }assert.equal(cases,329);
  for(const g of channelGuards){f.before(tx=>tx.$executeRawUnsafe(`ALTER TABLE ${g.table} DISABLE TRIGGER ${g.name}`).then(()=>{}));await assert.rejects(f.store.transition(await f.transition()));}
 });
 await t.test('replica mode and missing/legacy audit deny without read repair',async()=>{
  const f=await channelFixture(db);await grant(f);const before=await snapshot();
  await probe(async tx=>{await tx.$executeRaw`SET LOCAL session_replication_role=replica`;assert.ok((await inspectCanonicalBootstrapChannel(tx,f.ticket.id,f.now())).blockers.length);});
  f.before(tx=>tx.$executeRaw`SET LOCAL session_replication_role=replica`.then(()=>{}));await assert.rejects(f.store.transition(await f.transition()));
  await probe(async tx=>{await tx.$executeRaw`SET LOCAL session_replication_role=replica`;await tx.$executeRaw`DELETE FROM worker_transport_write_audit WHERE generation_id=${f.snapshot.generation}::uuid`;await tx.$executeRaw`SET LOCAL session_replication_role=origin`;assert.ok((await inspectCanonicalBootstrapChannel(tx,f.ticket.id,f.now())).blockers.length);});assert.deepEqual(await snapshot(),before);
 });
 await t.test('source fence blocks direct writers and source ABA invalidates unused approval permanently',async()=>{
  const f=await channelFixture(db);await grant(f);let release!:()=>void,ready!:()=>void;const gate=new Promise<void>(r=>release=r),locked=new Promise<void>(r=>ready=r);
  const holder=db.$transaction(async tx=>{await tx.$queryRaw`SELECT revision FROM ready_source_fence WHERE id=1 FOR UPDATE`;ready();await gate;},{timeout:30000});await locked;
  let done=false;const writer=db.$executeRaw`UPDATE agent_hosts SET name=name WHERE id=${f.b.hostId}::uuid`.then(()=>done=true);
  try{let waiting=0;for(let n=0;n<30&&!waiting;n++){await new Promise(r=>setTimeout(r,25));waiting=(await db.$queryRaw<any[]>`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'`)[0].n;}assert.ok(waiting>0);assert.equal(done,false);}finally{release();await holder;await writer;}
  assert.ok((await f.store.inspect(f.ticket.id)).blockers.length);await assert.rejects(f.store.transition(await f.transition()));
 });
 await t.test('read-only inspection/status is pure and post-consume drift closes as unknown',async()=>{
  const f=await channelFixture(db);await grant(f);const before=await snapshot();for(let n=0;n<3;n++)assert.deepEqual((await f.store.inspect(f.ticket.id)).blockers,[]);assert.deepEqual(await snapshot(),before);assert.ok(f.modes.every(v=>v==='on'));
  await f.store.transition(await f.transition());await db.$executeRaw`UPDATE agent_hosts SET name=name WHERE id=${f.b.hostId}::uuid`;const result=await f.store.transition(await f.transition('close'));assert.equal(result.action,'unknown');
 });
 await t.test('canonical BootstrapAuthoritySource removes only channel and retains two independent blockers',async()=>{
  const f=await channelFixture(db);await grant(f);const source=createCanonicalBootstrapAuthoritySource(f.now);await db.$transaction(async tx=>{await tx.$executeRaw`SET TRANSACTION READ ONLY`;const release=await source.bindTransaction!(tx,'read');try{await assert.rejects(source.context(tx,f.b,f.ticket.issuedAt,f.ticket.id),(e:any)=>e instanceof CanonicalBootstrapBlocked&&JSON.stringify(e.blockers)===JSON.stringify(['bootstrap_ticket_revocation_unavailable','signed_current_decision_unavailable']));}finally{release();}},{isolationLevel:'RepeatableRead'});
 });
 await t.test('native public IPv4 shape rejects null/unsorted/duplicate/private sets and caller overrides',async()=>{
  const f=await channelFixture(db);assert.deepEqual(await db.$queryRaw<any[]>`SELECT transport_bootstrap_shape(${JSON.stringify(f.snapshot)}::jsonb) AS valid`,[{valid:true}]);
  for(const patch of [{publicAddresses:[]},{publicAddresses:['127.0.0.1']},{publicAddresses:['8.8.8.8','8.8.8.8']},{publicAddresses:['9.9.9.9','8.8.8.8']},{publicAddresses:['::1']},{caDigest:null},{proxy:true},{resolverPolicy:'other'},{purpose:null}])assert.deepEqual(await db.$queryRaw<any[]>`SELECT transport_bootstrap_shape(${JSON.stringify({...f.snapshot,...patch})}::jsonb) AS valid`,[{valid:false}]);
  for(const key of ['url','ca','pin','ips','epoch','headers'])await assert.rejects(f.store.grant({...f.command(),[key]:'override'}));
 });
 await t.test('persisted grants are public-only with native matching automatic receipts; no external effects',async()=>{
  const rows=await db.$queryRaw<any[]>`SELECT (a.row_digest=encode(sha256(convert_to(to_jsonb(g)::text,'UTF8')),'hex')) AS verified,g.record FROM worker_transport_bootstrap_grants g JOIN worker_transport_write_audit a ON a.table_name='worker_transport_bootstrap_grants' AND a.row_id=g.id::text`;
  assert.ok(rows.length);assert.ok(rows.every(r=>r.verified));assert.ok(!JSON.stringify(rows).includes('PRIVATE KEY'));assert.equal(effects,0);assert.deepEqual(logs,[]);
 });
});
