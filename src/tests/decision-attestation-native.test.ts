import test from 'node:test';import assert from 'node:assert/strict';import crypto,{randomUUID} from 'node:crypto';
import net from 'node:net';import tls from 'node:tls';import http from 'node:http';import https from 'node:https';import dns from 'node:dns';import childProcess from 'node:child_process';
import {PrismaClient} from '@prisma/client';
import {attestationNativeFixture,owned,prepare} from './decision-attestation-native-fixture';
import {ticketFixture} from './bootstrap-ticket-native-fixture';
import {decisionAttestationOwnGuards,decisionAttestationOwnHelpers} from '../modules/api-keys/decision-attestation-guards';
import {requireDecisionAttestationGuards} from '../modules/api-keys/decision-attestation-adapter';
import {reviewDigest} from '../modules/agent-runtime/task-review-contract';
import {advanceTicketLifecycle,lifecycleFlags} from '../modules/api-keys/bootstrap-ticket-lifecycle-contract';
test('native decision attestation qualification',{skip:!process.env.WORKER_IDENTITY_NATIVE_DATABASE,timeout:850000},async t=>{
 const db=new PrismaClient();await db.$connect();t.after(()=>db.$disconnect());await owned(db);
 let effects=0;const forbid=()=>{effects++;throw Error('non-database effect forbidden');};
 for(const m of ['connect','createConnection'] as const)t.mock.method(net,m,forbid);t.mock.method(net.Server.prototype,'listen',forbid);t.mock.method(tls,'connect',forbid);
 for(const module of [http,https])for(const m of ['request','get'] as const)t.mock.method(module,m,forbid);
 for(const m of ['lookup','resolve','resolve4','resolve6'] as const){t.mock.method(dns,m,forbid);t.mock.method(dns.promises,m,forbid);}
 t.mock.method(globalThis,'fetch',forbid);for(const m of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'] as const)t.mock.method(childProcess,m,forbid);
 for(const m of ['generateKeyPair','generateKeyPairSync','createPrivateKey','sign'] as const)t.mock.method(crypto,m,forbid);
 const tables=['decisions','decision_revisions','decision_acceptances','decision_attestation_key_history','decision_owner_auth_evidence','decision_attestations','decision_authority_events',
 'decision_attestation_write_receipts','worker_bootstrap_attempts','worker_bootstrap_history','worker_bootstrap_heads','worker_bootstrap_audit','worker_bootstrap_lifecycle_events','worker_bootstrap_write_receipts','ready_source_fence','events'];
 async function snapshot(){const rows=[];for(const table of tables)rows.push(await db.$queryRawUnsafe(`SELECT count(*)::int AS count,md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY to_jsonb(t)::text),'')) AS digest FROM ${table} t`));return rows;}
 async function ready(options:{policyTtlMs?:number}={}){const f=await attestationNativeFixture(db,options);await f.ready();return f;}
 async function attest(f:Awaited<ReturnType<typeof ready>>){const r=await f.ports.execute(await f.command('attest'));assert.equal(r.ok,true,JSON.stringify({r,errors:f.errors}));return r;}
 async function count(f:Awaited<ReturnType<typeof ready>>){return (await db.$queryRaw<any[]>`SELECT
 (SELECT count(*)::int FROM decision_attestations WHERE decision_id=${f.q.decisionId}::uuid) AS attestations,
 (SELECT count(*)::int FROM worker_bootstrap_attempts WHERE ticket_id=${f.q.ticketId}::uuid) AS attempts,
 (SELECT count(*)::int FROM decision_authority_events WHERE decision_id=${f.q.decisionId}::uuid AND action IN ('revoke','supersede','reject','expire')) AS terminal`)[0];}
 const unknown=(r:any)=>{assert.equal(r.ok,false);assert.equal(r.error,'reconciliation_required');assert.equal(r.retryable,false);};
 async function operation(kind:string){const g=await ready();if(kind!=='attest')await attest(g);return {g,c:await g.command(kind,kind==='terminal'?{action:'revoke'}:{})};}
 async function operationCount(g:Awaited<ReturnType<typeof ready>>,kind:string){const c=await count(g);return kind==='attest'?c.attestations:kind==='seal'?c.attempts:c.terminal;}
 await db.$executeRawUnsafe("CREATE OR REPLACE FUNCTION native_attestation_fail() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic attestation failure'; END $$");
 await db.$executeRawUnsafe("CREATE OR REPLACE FUNCTION native_attestation_late_fail() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(0.1); RAISE EXCEPTION 'synthetic deferred attestation failure'; END $$");
 await t.test('migration 82 standalone lifecycle remains valid after 83 and strict anti-ABA still denies',async()=>{
  const g=await ticketFixture(db);await g.store.register(g.registration);await g.store.transition(await g.command('reserve'));await g.store.transition(await g.command('consume'));
  assert.equal((await g.store.inspect({ticketId:g.identity.ticketId})).ok,true);
  const h=await ticketFixture(db);await h.store.register(h.registration);const stale=await h.command('reserve');
  await db.$executeRaw`UPDATE ready_source_fence SET revision=revision+1 WHERE id=1`;const before=await snapshot();
  await assert.rejects(h.store.transition(stale));const current=await h.store.inspect({ticketId:h.identity.ticketId});assert.equal(current.ok,true);
  if(!current.ok)throw Error('legacy inspection unavailable');assert.equal(current.usable,false);
  await assert.rejects(h.store.transition({...stale,operationId:randomUUID(),expectedFence:current.fence}));assert.deepEqual(await snapshot(),before);
  const event=advanceTicketLifecycle(h.identity,current.head,current.digest,{id:randomUUID(),action:'reserve',attemptId:null,historyId:null},new Date());
  await assert.rejects(db.$transaction(async tx=>{await tx.$executeRaw`INSERT INTO worker_bootstrap_lifecycle_events(id,ticket_id,revision,previous_digest,record,record_digest,attempt_id,history_id,writer_xid)
   VALUES(${event.id}::uuid,${event.ticketId}::uuid,${event.revision},${event.previousDigest},${JSON.stringify(event)}::jsonb,${reviewDigest(event)},NULL,NULL,pg_current_xact_id()::text)`;
  },{isolationLevel:'Serializable'}),(e:any)=>String(e.meta?.message).includes('bootstrap_source_aba_or_stale'));
  assert.deepEqual(await snapshot(),before);
  assert.equal((await db.$queryRaw<any[]>`SELECT authority_revision FROM decisions WHERE id=${h.identity.decisionId}::uuid`)[0].authority_revision,null);
 });
 const f=await attestationNativeFixture(db);await f.ready();
 await t.test('actual attest and seal use automatic receipts and separate READ ONLY COMMIT proof',async()=>{
  assert.equal((await f.ports.execute(await f.command('attest'))).ok,true,JSON.stringify(f.errors));
  const lineage:boolean[]=[];
  f.afterQuery(async(tx,sql)=>{if(sql.startsWith('INSERT INTO worker_bootstrap_')){
   const row=(await tx.$queryRaw<any[]>`SELECT decision_attestation_lineage(${f.q.ticketId}::uuid,revision) AS valid FROM ready_source_fence WHERE id=1`)[0];lineage.push(row.valid);}});
  assert.equal((await f.ports.execute(await f.command('seal'))).ok,true,JSON.stringify(f.errors));
  f.afterQuery();assert.equal(lineage.length,5);assert.ok(lineage.every(Boolean),'lineage holds after every native start phase');
  assert.deepEqual(await count(f),{attestations:1,attempts:1,terminal:0});assert.equal((await f.ports.inspect(f.q)).ok,true);
  const proof=await db.$queryRaw<any[]>`SELECT a.attestation_seal AS seal,a.attestation_committed_at AS at,r.writer_xid AS xid,r.fence_revision::text AS fence
   FROM worker_bootstrap_attempts a JOIN decision_attestation_write_receipts r ON r.table_name='worker_bootstrap_attempts' AND r.row_id=a.id::text||':'||a.host_id::text WHERE a.ticket_id=${f.q.ticketId}::uuid`;
  assert.equal(proof.length,1);assert.equal(proof[0].seal.state,'started');assert.ok(BigInt(proof[0].seal.sourceFence)<=BigInt(proof[0].fence));
  const modes=f.transactions.map(v=>v.mode);assert.ok(modes.includes('read')&&modes.includes('write'));assert.equal(new Set(f.transactions.map(v=>v.db)).size,f.transactions.length);
 });
 await t.test('lineage binds exact through-fence and both receipt families including nested shared epochs',async()=>{
  const g=await ready();await attest(g);const p=await g.projection();
  for(const offset of [-1n,0n,1n])assert.equal((await db.$queryRaw<any[]>`SELECT decision_attestation_lineage(${g.q.ticketId}::uuid,${String(BigInt(p.version.fence)+offset)}::bigint) AS valid`)[0].valid,offset===0n);
  assert.equal((await g.ports.execute(await g.command('seal'))).ok,true,JSON.stringify(g.errors));
  const rows=await db.$queryRaw<any[]>`SELECT fence::text,count(*)::int AS n,count(DISTINCT family)::int AS families FROM (
   SELECT r.fence_revision AS fence,'new' AS family FROM decision_attestation_write_receipts r WHERE r.workspace_id=${g.b.workspaceId}::uuid AND r.fence_revision>${p.version.fence}::bigint
   UNION ALL SELECT r.fence_revision,'old' FROM worker_bootstrap_write_receipts r WHERE r.ticket_id=${g.q.ticketId}::uuid AND r.fence_revision>${p.version.fence}::bigint
  ) proof GROUP BY fence ORDER BY fence`;
  assert.equal(rows.length,6);assert.ok(rows.some(r=>r.n>=3&&r.families===2),'nested old audit and new history share an epoch');
  assert.ok(rows.every((r,i)=>BigInt(r.fence)===BigInt(p.version.fence)+BigInt(i+1)));
 });
 await t.test('migration 83 preserves legacy rows and unique attempt registry without admitting null seed',async()=>{
  const saved=await db.$queryRaw<any[]>`SELECT kind,body FROM native_attestation_preflight`;
  for(const {kind,body} of saved)for(const old of body){const ident=old.id?'id':kind==='decision_revisions'?'decision_id':'workspace_id';
   const row=(await db.$queryRawUnsafe<any[]>(`SELECT to_jsonb(t)-ARRAY['authority_revision','attestation_id','attestation_seal','attestation_committed_at','attestation_mutation_digest'] AS value FROM ${kind} t WHERE ${ident}='${old[ident]}'`))[0];assert.deepEqual(row.value,old);}
  const legacy=saved.find(r=>r.kind==='worker_bootstrap_tickets').body[0],before=await snapshot();
  assert.equal((await f.ports.inspect({decisionId:legacy.decision_id,ticketId:legacy.id})).ok,false);
  await assert.rejects(db.$executeRaw`UPDATE decisions SET authority_revision=1 WHERE id=${legacy.decision_id}::uuid`);assert.deepEqual(await snapshot(),before);
  assert.equal((await db.$queryRaw<any[]>`SELECT count(*)::int AS n FROM pg_constraint WHERE conrelid='worker_bootstrap_attempts'::regclass AND contype='u' AND pg_get_constraintdef(oid)='UNIQUE (ticket_id)'`)[0].n,1);
 });
 await t.test('111 own trigger bindings, 15 new functions, upgraded lifecycle guard and five helpers are exact',async()=>{
  assert.equal(decisionAttestationOwnGuards.length,111);assert.equal(decisionAttestationOwnHelpers.length,5);
  await db.$transaction(async tx=>{await tx.$executeRaw`SET TRANSACTION READ ONLY`;await requireDecisionAttestationGuards(tx);},{isolationLevel:'RepeatableRead'});
  const g=await ready(),p=await g.projection();assert.ok(Number(p.version.authorityRevision)>1);assert.match(p.clock.at,/\.\d{6}Z$/);
  const rows=await db.$queryRaw<any[]>`SELECT revision::text AS revision,fence_revision::text AS fence FROM decision_authority_events WHERE decision_id=${g.q.decisionId}::uuid ORDER BY decision_authority_events.revision`;
  assert.equal(rows.at(-1).revision,p.version.authorityRevision);assert.ok(rows.every((r,n)=>!n||BigInt(r.fence)>BigInt(rows[n-1].fence)));
 });
 await t.test('key create/adopt/stage/cutover/retire/revoke and auth evidence execute native constraints',async()=>{
  for(const initial of ['create','adopt']){const g=await attestationNativeFixture(db);assert.equal((await g.key(initial,g.material.keyId,g.material)).ok,true,JSON.stringify(g.errors));
   assert.equal((await g.ports.execute(await g.command('auth'))).ok,true);}
  const g=await ready(),key={...g.material,keyId:randomUUID(),epoch:2,publicKey:'3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c',publicKeyDigest:''};
  key.publicKeyDigest=reviewDigest({domain:'owner-decision-public-key-v1',value:{algorithm:key.algorithm,format:key.format,publicKey:key.publicKey}});
  const start=new Date(Date.now()+10000).toISOString(),cutover=new Date(Date.now()+12000).toISOString();assert.equal((await g.key('stage',key.keyId,key,start,cutover)).ok,true,JSON.stringify(g.errors));
  await new Promise(r=>setTimeout(r,Math.max(0,Date.parse(cutover)-Date.now()+100)));assert.equal((await g.key('cutover',key.keyId)).ok,true,JSON.stringify(g.errors));assert.equal((await g.key('retire',g.material.keyId)).ok,true);assert.equal((await g.key('revoke',key.keyId)).ok,true);
  assert.equal((await g.ports.execute(await g.command('attest'))).ok,false);assert.equal(g.counts.signatures,0);
 });
 await t.test('terminal decisions remain immutable and cannot regain signed authority',async()=>{
  for(const action of ['revoke','supersede','reject']){const g=await ready();await attest(g);assert.equal((await g.ports.execute(await g.command('terminal',{action}))).ok,true,JSON.stringify(g.errors));
   assert.equal((await g.ports.inspect(g.q)).ok,false);assert.equal((await g.ports.execute(await g.command('terminal',{action}))).ok,false);assert.equal((await count(g)).terminal,1);}
  const g=await ready();await attest(g);assert.equal((await g.ports.execute(await g.command('terminal',{action:'expire'}))).ok,false);
  const expired=await ready({policyTtlMs:10000});await attest(expired);
  await new Promise(r=>setTimeout(r,Math.max(0,Date.parse(expired.policy.expiresAt)-Date.now()+100)));
  assert.equal((await expired.ports.execute(await expired.command('terminal',{action:'expire'}))).ok,true,JSON.stringify(expired.errors));
  assert.equal((await expired.ports.inspect(expired.q)).ok,false);assert.equal((await count(expired)).terminal,1);
 });
 await t.test('seal versus twenty revokes and revoke versus twenty seals preserve both lock orders',async()=>{
  for(const first of ['seal','terminal']){const g=await ready();await attest(g);const base=await g.command('seal');
   let locked!:()=>void,release!:()=>void;const waiting=new Promise<void>(r=>locked=r),gate=new Promise<void>(r=>release=r);
   g.before(async tx=>{await tx.$queryRaw`SELECT revision FROM ready_source_fence WHERE id=1 FOR UPDATE`;locked();await gate;});
   const leading=g.ports.execute({...base,kind:first,...(first==='terminal'?{action:'revoke'}:{})});await waiting;
   const rest=Array.from({length:20},()=>g.ports.execute({...base,operationId:randomUUID(),kind:first==='seal'?'terminal':'seal',...(first==='seal'?{action:'revoke'}:{})}));
   release();const outcomes=await Promise.all([leading,...rest]);assert.equal(outcomes[0].ok,true,JSON.stringify(g.errors));assert.equal(outcomes.filter(r=>r.ok).length,1);
   assert.equal((await count(g)).attempts,first==='seal'?1:0);assert.ok(!g.errors.some(e=>e.includes('40P01')),'no PostgreSQL deadlock');
   if(first==='seal')assert.equal((await g.ports.execute(await g.command('terminal',{action:'revoke'}))).ok,true);
   assert.equal((await g.ports.inspect(g.q)).ok,false);
  }
 });
 for(const kind of ['attest','seal','terminal'])await t.test('twenty concurrent '+kind+' operations have one committed CAS winner and no retries',async()=>{
  const g=await ready();if(kind==='seal')await attest(g);const command=await g.command(kind,kind==='terminal'?{action:'revoke'}:{}),writes=g.counts.writes;
  const results=await Promise.all(Array.from({length:20},()=>g.ports.execute({...command,operationId:randomUUID()})));assert.equal(results.filter(r=>r.ok).length,1,JSON.stringify(g.errors));
  assert.equal(g.counts.writes-writes,20);const c=await count(g);assert.equal(kind==='attest'?c.attestations:kind==='seal'?c.attempts:c.terminal,1);
 });
 await t.test('rollback state history Event audit receipt fence and attempt phases preserves exact fingerprints',async()=>{
  for(const phase of ['decision_attestations','decision_authority_events','events','decision_attestation_write_receipts','ready_source_fence','worker_bootstrap_attempts','worker_bootstrap_history','worker_bootstrap_heads','worker_bootstrap_audit','worker_bootstrap_lifecycle_events','worker_bootstrap_lifecycle_events:consume']){
   const [table,action]=phase.split(':');
   const g=await ready(),seal=table.startsWith('worker_');if(seal)await attest(g);const c=await g.command(seal?'seal':'attest'),before=await snapshot();
   g.before(tx=>tx.$executeRawUnsafe(`CREATE TRIGGER zzz_native_attestation_failure AFTER ${table==='ready_source_fence'?'UPDATE':'INSERT'} ON ${table} FOR EACH ROW ${action?"WHEN (NEW.record->>'action'='consume') ":''}EXECUTE FUNCTION native_attestation_fail()`).then(()=>{}));
   assert.equal((await g.ports.execute(c)).ok,false,table);assert.deepEqual(await snapshot(),before,table);
   assert.ok(g.errors.some(e=>e.includes('synthetic attestation failure')),table+': target fault must be reached; earlier denial is not rollback-phase qualification');
  }
 });
 await t.test('deferred rejection including false Prisma success is reconciliation with zero committed children',async()=>{
  for(const kind of ['attest','seal','terminal'])for(const late of [false,true]){const {g,c}=await operation(kind),before=await snapshot();
   const table=kind==='attest'?'decision_attestations':kind==='seal'?'worker_bootstrap_attempts':'decision_authority_events';
   g.before(tx=>tx.$executeRawUnsafe(`CREATE CONSTRAINT TRIGGER native_attestation_commit_failure AFTER INSERT ON ${table} DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ${late?'native_attestation_late_fail':'native_attestation_fail'}()`).then(()=>{}));
   unknown(await g.ports.execute(c));assert.deepEqual(await snapshot(),before);assert.equal(await operationCount(g,kind),0);}
 });
 await t.test('false unknown ACK and real pre-COMMIT connection loss have zero operations and no retry',async()=>{
  for(const kind of ['attest','seal','terminal'])for(const fault of ['false','unknown','connection']){const {g,c}=await operation(kind),before=await snapshot(),writes=g.counts.writes;g.fault(fault);
   unknown(await g.ports.execute(c));assert.deepEqual(await snapshot(),before);assert.equal(await operationCount(g,kind),0);assert.equal(g.counts.writes,writes+1);}
 });
 await t.test('three wire response losses after actual COMMIT each leave one immutable operation',async()=>{
  for(const kind of ['attest','seal','terminal']){const {g,c}=await operation(kind),writes=g.counts.writes;g.before(tx=>tx.$queryRawUnsafe("SELECT 'native_drop_commit_response'").then(()=>{}));
   unknown(await g.ports.execute(c));assert.equal(await operationCount(g,kind),1);assert.equal(g.counts.writes,writes+1);
   assert.equal((await g.ports.execute({...c,expected:(await g.projection()).version})).ok,false);}
 });
 await t.test('missing mismatched and unavailable READ ONLY readback never replay committed operations',async()=>{
  for(const kind of ['attest','seal','terminal'])for(const fault of ['missing','mismatch','readback']){const {g,c}=await operation(kind),writes=g.counts.writes;g.fault(fault);
   unknown(await g.ports.execute(c));assert.equal(await operationCount(g,kind),1);assert.equal(g.counts.writes,writes+1);g.fault('');assert.equal((await g.ports.inspect(g.q)).ok,kind!=='terminal');}
 });
 await t.test('missing stale replayed and foreign receipts plus fresh expected global gaps deny before seal writes',async()=>{
  for(const fault of ['missing','stale','replay','foreign','gap']){const g=await ready();await attest(g);const original=await g.command('seal');
   if(fault==='gap')await db.$executeRaw`UPDATE ready_source_fence SET revision=revision+1 WHERE id=1`;
   else if(fault==='foreign'){const other=await ready();await attest(other);}
   else {const proof=(await db.$queryRaw<any[]>`SELECT r.* FROM decision_attestation_write_receipts r JOIN decision_attestations a ON r.table_name='decision_attestations' AND r.row_id=a.id::text WHERE a.decision_id=${g.q.decisionId}::uuid`)[0];
    await prepare(db,async tx=>{
     if(fault==='missing')await tx.$executeRaw`DELETE FROM decision_attestation_write_receipts WHERE id=${proof.id}::uuid`;
     if(fault==='stale'){await tx.$executeRaw`UPDATE decision_attestation_write_receipts SET fence_revision=fence_revision-1 WHERE id=${proof.id}::uuid`;
      await tx.$executeRaw`UPDATE events SET payload=jsonb_set(payload,'{fence}',${JSON.stringify(String(BigInt(proof.fence_revision)-1n))}::jsonb) WHERE id=${proof.event_id}::uuid`;}
     if(fault==='replay'){const event=randomUUID();await tx.$executeRaw`INSERT INTO events SELECT (jsonb_populate_record(NULL::events,to_jsonb(e)||jsonb_build_object('id',${event}::uuid))).* FROM events e WHERE id=${proof.event_id}::uuid`;
      await tx.$executeRaw`INSERT INTO decision_attestation_write_receipts SELECT (jsonb_populate_record(NULL::decision_attestation_write_receipts,to_jsonb(r)||jsonb_build_object('id',${randomUUID()}::uuid,'event_id',${event}::uuid))).* FROM decision_attestation_write_receipts r WHERE id=${proof.id}::uuid`;}
    });
   }
   const before=await snapshot(),writes=g.counts.statements;let expected;
   if(fault==='missing'){await assert.rejects(g.projection());expected=original.expected;}
   else expected=(await g.projection()).version;
   assert.equal((await g.ports.execute({...g.q,kind:'seal',operationId:randomUUID(),expected})).ok,false,fault);
   assert.equal(g.counts.statements,writes,fault);assert.deepEqual(await snapshot(),before,fault);assert.equal((await count(g)).attempts,0);
  }
 });
 await t.test('source key owner lifecycle issuer channel and accepted-policy mutations deny before seal writes',async()=>{
  for(const fault of ['source','key','owner','lifecycle','issuer','channel','policy']){const g=await ready();await attest(g);const original=await g.command('seal');
   if(fault==='key')assert.equal((await g.key('revoke')).ok,true);
   else if(fault==='source')await db.$executeRaw`UPDATE workspaces SET name=name WHERE id=${g.b.workspaceId}::uuid`;
   else await prepare(db,async tx=>{
    if(fault==='owner')await tx.$executeRaw`UPDATE workspace_memberships SET role='member' WHERE workspace_id=${g.b.workspaceId}::uuid AND user_id=${g.auth.ownerId}::uuid`;
    if(fault==='lifecycle')await tx.$executeRaw`UPDATE worker_identity_lifecycle SET generation=${randomUUID()}::uuid WHERE workspace_id=${g.b.workspaceId}::uuid AND kind='host'`;
    if(fault==='issuer')await tx.$executeRaw`UPDATE trusted_provider_ticket_keys SET epoch=epoch+1 WHERE workspace_id=${g.b.workspaceId}::uuid`;
    if(fault==='channel')await tx.$executeRaw`UPDATE worker_transport_bootstrap_grants SET record_digest=${'f'.repeat(64)} WHERE ticket_id=${g.q.ticketId}::uuid`;
    if(fault==='policy')await tx.$executeRaw`UPDATE decision_revisions SET body=jsonb_set(body,'{ownerDecisionAttestation,revision}','2'::jsonb) WHERE decision_id=${g.q.decisionId}::uuid`;
   });
   const before=await snapshot(),writes=g.counts.statements;let expected;
   try{expected=(await g.projection()).version;}catch{assert.equal((await g.ports.inspect(g.q)).ok,false);expected=original.expected;}
   assert.equal((await g.ports.execute({...g.q,kind:'seal',operationId:randomUUID(),expected})).ok,false,fault);
   assert.equal(g.counts.statements,writes,fault);assert.deepEqual(await snapshot(),before,fault);
  }
 });
 await t.test('all attestation trigger bindings and helper definitions reject tampering then recover',async()=>{
  const g=await ready();await attest(g);
  for(const guard of decisionAttestationOwnGuards){await db.$executeRawUnsafe(`ALTER TABLE ${guard.table} DISABLE TRIGGER ${guard.name}`);
   try{assert.equal((await g.ports.inspect(g.q)).ok,false,guard.name);}finally{await db.$executeRawUnsafe(`ALTER TABLE ${guard.table} ENABLE TRIGGER ${guard.name}`);}}
  for(const helper of decisionAttestationOwnHelpers){const original=(await db.$queryRaw<any[]>`SELECT pg_get_functiondef(oid) AS body FROM pg_proc WHERE proname=${helper.name}`)[0].body;
   const args=helper.args.split(' ').map(x=>({25:'text',3802:'jsonb',2950:'uuid',20:'bigint'} as any)[x]).join(',');
   await db.$executeRawUnsafe(`ALTER FUNCTION ${helper.name}(${args}) SET search_path=pg_catalog`);try{assert.equal((await g.ports.inspect(g.q)).ok,false);}finally{await db.$executeRawUnsafe(original);}}
  assert.equal((await g.ports.inspect(g.q)).ok,true);
 });
 await t.test('replica UTC isolation and source-owner drift deny without read repair',async()=>{
  const g=await ready();await attest(g);const before=await snapshot();
  for(const sql of ["SET LOCAL session_replication_role=replica","SET LOCAL TIME ZONE 'Europe/Berlin'"]){g.before(tx=>tx.$executeRawUnsafe(sql).then(()=>{}));assert.equal((await g.ports.inspect(g.q)).ok,false);assert.deepEqual(await snapshot(),before);}
  await db.$transaction(async tx=>{await assert.rejects(g.ports.bind(tx,'read'));},{isolationLevel:'ReadCommitted'});
  await db.$executeRaw`UPDATE workspaces SET name=name WHERE id=${g.b.workspaceId}::uuid`;assert.equal((await g.ports.inspect(g.q)).ok,false);
 });
 await t.test('READ ONLY inspect is pure and complete receipt deletion fails closed',async()=>{
  const g=await ready();await attest(g);const before=await snapshot();for(let n=0;n<3;n++)assert.equal((await g.ports.inspect(g.q)).ok,true);assert.deepEqual(await snapshot(),before);
  await prepare(db,tx=>tx.$executeRaw`DELETE FROM decision_attestation_write_receipts WHERE workspace_id=${g.b.workspaceId}::uuid`);const damaged=await snapshot();
  assert.equal((await g.ports.inspect(g.q)).ok,false);assert.deepEqual(await snapshot(),damaged);
 });
 await t.test('start seal is durable before dispatch and the same-transaction dispatch guard refuses',async()=>{
  const g=await ready();await attest(g);let checked=false;
  g.afterQuery(async(tx,sql)=>{if(checked||!sql.startsWith('INSERT INTO worker_bootstrap_lifecycle_events'))return;
   const h=(await tx.$queryRaw<any[]>`SELECT h.* FROM worker_bootstrap_history h JOIN worker_bootstrap_attempts a ON a.id=h.attempt_id WHERE a.ticket_id=${g.q.ticketId}::uuid ORDER BY h.revision DESC LIMIT 1`)[0];if(!h)return;checked=true;
   const profile=g.reg.record.signed.payload.intent.channel.profile,peer={payload:{binding:g.b,attemptId:h.attempt_id,ticketDigest:g.reg.identity.ticketDigest,origin:profile.origin,pin:profile.certificate.fingerprint,certificateEpoch:g.reg.record.signed.payload.intent.channel.certificateEpoch},signature:'0'.repeat(128)};
   const record={...h.record,id:randomUUID(),revision:2,previousDigest:h.record_digest,previousState:h.state,state:'dispatched',peer};
   await tx.$executeRaw`SAVEPOINT native_dispatch_denial`;
   await assert.rejects(tx.$executeRaw`INSERT INTO worker_bootstrap_history(id,attempt_id,revision,state,record,record_digest,previous_revision,previous_digest,previous_state)
    VALUES(${record.id}::uuid,${h.attempt_id}::uuid,2,'dispatched',${JSON.stringify(record)}::jsonb,${reviewDigest(record)},1,${h.record_digest},'consumed')`,(e:any)=>String(e.meta?.message).includes('decision_attestation_start_commit_required'));
   await tx.$executeRaw`ROLLBACK TO SAVEPOINT native_dispatch_denial`;
  });assert.equal((await g.ports.execute(await g.command('seal'))).ok,true,JSON.stringify(g.errors));assert.equal(checked,true);assert.equal((await count(g)).attempts,1);
 });
 await t.test('conditional persistence inspection never enables production or private-key effects',async()=>{
  const g=await ready();await attest(g);const r=await g.ports.inspect(g.q);assert.equal(r.ok,true);for(const k of Object.keys(lifecycleFlags))assert.equal((r as any)[k],false);
  const verifier=g.deps.verifier;g.deps.verifier=undefined;assert.equal((await g.ports.inspect(g.q)).ok,false);g.deps.verifier=verifier;assert.equal(effects,0);
 });
});
