import test from 'node:test';
import assert from 'node:assert/strict';
import crypto,{randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {PrismaClient} from '@prisma/client';
import {owned,prepare,material as issuerMaterial} from './bootstrap-channel-native-fixture';
import {proofNativeFixture,materials} from './bootstrap-proof-authority-native-fixture';
import {proofBytes,proofDigest} from '../modules/api-keys/bootstrap-proof-encoding';
import {proofReference,replayProofKeys,selectProofKey} from '../modules/api-keys/bootstrap-proof-key-contract';
import {createPrismaProofAuthorityStore,requireProofPersistenceGuards,readCanonicalProofAuthority,readProofOperation} from '../modules/api-keys/bootstrap-proof-persistence';
import {proofPersistenceFunctions,proofPersistenceTriggers,proofPersistenceForeignKeys} from '../modules/api-keys/bootstrap-proof-persistence-guards';
import {lifecycleFlags} from '../modules/api-keys/bootstrap-ticket-lifecycle-contract';
import {nativeCompletionHarness} from './bootstrap-canonical-completion-native-fixture';
import {reviewDigest} from '../modules/agent-runtime/task-review-contract';

test('native public bootstrap proof authority',{skip:!process.env.WORKER_IDENTITY_NATIVE_DATABASE,timeout:850000},async t=>{
 const sourceHash=()=>crypto.createHash('sha256').update(readFileSync('src/tests/bootstrap-proof-authority-native.test.ts')).update(readFileSync('src/tests/bootstrap-proof-authority-native-fixture.ts')).digest('hex'),startedSourceHash=sourceHash();
 const db=new PrismaClient(),url=new URL(process.env.DATABASE_URL!);url.searchParams.set('connection_limit','1');
 const clients=Array.from({length:20},()=>new PrismaClient({datasources:{db:{url:url.toString()}}}));
 await db.$connect();await owned(db);await Promise.all(clients.map(c=>c.$connect()));
 t.after(async()=>{await Promise.allSettled(clients.map(c=>c.$disconnect()));await db.$disconnect();});
 let effects=0;for(const method of ['generateKeyPair','generateKeyPairSync','createPrivateKey','sign'] as const)t.mock.method(crypto,method,()=>{effects++;throw Error('private crypto forbidden');});
 const tables=['bootstrap_proof_key_history','bootstrap_proof_attachments','bootstrap_proof_ticket_links','bootstrap_proof_write_receipts','ready_source_fence','events','workspaces','workspace_memberships','decisions','decision_revisions','decision_acceptances','worker_identity_lifecycle','trusted_provider_ticket_keys'];
 const snapshot=()=>db.$queryRawUnsafe(tables.map(table=>`SELECT '${table}' AS tbl,count(*)::int AS count,md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY to_jsonb(t)::text),'')) AS digest FROM ${table} t`).join(' UNION ALL ')+' ORDER BY tbl');
 const fresh=()=>proofNativeFixture(db),success=(r:any,h:any)=>{assert.ok(r.ok,JSON.stringify(h.errors));for(const flag of Object.keys(lifecycleFlags))assert.equal(r[flag],false);},uncertain=(r:any)=>{assert.equal(r.ok,false);assert.equal(r.error,'reconciliation_required');assert.equal(r.retryable,false);};
 const guard=()=>db.$transaction(async tx=>{await tx.$executeRaw`SET TRANSACTION READ ONLY`;await tx.$executeRaw`SET LOCAL search_path=pg_catalog,public`;await requireProofPersistenceGuards(tx);},{isolationLevel:'RepeatableRead'});
 await db.$executeRawUnsafe("CREATE FUNCTION native_proof_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic native proof rejection'; END $$");
 let first=false;
 await t.test('all final guards and real first reservation with independent committed readback',async()=>{
  await guard();const h=await fresh();await h.seed();const c=await h.attachment();success(await h.api.attach(c),h);
  const before=await snapshot(),r=await h.api.inspect(c.attachment);success(r,h);assert.ok(r.ok);assert.equal(r.facts.authorityPersistenceRecorded,true);assert.ok(r.facts.blockers.includes('bootstrap_proof_v3_seal_unavailable'));assert.deepEqual(await snapshot(),before);
  const direct=await db.$transaction(async tx=>{await tx.$executeRaw`SET TRANSACTION READ ONLY`;await tx.$executeRaw`SET LOCAL search_path=pg_catalog,public`;return readCanonicalProofAuthority(tx,c.attachment);},{isolationLevel:'RepeatableRead'});assert.deepEqual(direct.attachment,c.attachment);
  assert.equal((await db.$queryRaw<any[]>`SELECT count(*)::int AS n FROM worker_bootstrap_tickets WHERE id=${c.attachment.ticketId}::uuid`)[0].n,0);first=true;
 });assert.ok(first,'Stop after initial native failure');
 await t.test('SQL and TypeScript binary bytes and digest agree without JSON text substitution',async()=>{
  const vectors:any[]=[null,true,false,0,1,-1,9007199254740991,-9007199254740991,'','é','𐀀','😀',{z:[true,null,{é:'😀'}],a:1,'𐀀':false,'\ue000':'x'},Array.from({length:80},(_,i)=>i),{}];
  for(const v of vectors){const [r]=await db.$queryRaw<any[]>`SELECT encode(bootstrap_proof_bytes(${JSON.stringify(v)}::jsonb,0),'hex') AS bytes,bootstrap_proof_digest(${JSON.stringify(v)}::jsonb) AS digest`;assert.equal(r.bytes,proofBytes(v).toString('hex'));assert.equal(r.digest,proofDigest(v));}
  assert.notEqual(proofDigest([1,2]),proofDigest([2,1]));assert.equal(proofDigest({b:2,a:1}),proofDigest({a:1,b:2}));
 });
 await t.test('encoding rejects controls Unicode coercions and resource limits at the object port',async()=>{
  let deep:any=0;for(let n=0;n<34;n++)deep=[deep];
  for(const v of ['\u0000','\u0001','\u001f','\u007f','e\u0301','\ud800',1.5,9007199254740992,Array(4097).fill(null),'x'.repeat(131073),deep]){assert.throws(()=>proofBytes(v));await assert.rejects(db.$queryRaw`SELECT bootstrap_proof_bytes(${JSON.stringify(v)}::jsonb,0)`);}
  for(const v of [undefined,NaN,Infinity,-0,1n,new Date(),Array(2),{get x(){throw Error('getter forbidden');}}])assert.throws(()=>proofBytes(v));
  const h=await fresh(),c=await h.command();const before=await snapshot();assert.equal((await h.api.applyKey(JSON.stringify(c))).ok,false);assert.deepEqual(await snapshot(),before);
  // PostgreSQL JSONB discards duplicate members and lexical -0. The public port
  // accepts objects only; raw JSON decoding is not a capability of this atom.
  const [r]=await db.$queryRaw<any[]>`SELECT '{"a":1,"a":2}'::jsonb AS value`;assert.deepEqual(r.value,{a:2});
 });
 await t.test('both principals create adopt stage overlap hard cutover retire revoke and high-water',async()=>{
  for(const principal of ['local_worker','roost_server'] as const){for(const initial of ['create','adopt'] as const){const h=await fresh();success(await h.api.applyKey(await h.command(principal,initial)),h);
   const begin=Date.now()+1500,end=begin+1200,c=await h.command(principal,'stage',{targetEpoch:2,material:materials[2],activatesAt:new Date(begin).toISOString(),cutoverAt:new Date(end).toISOString()});success(await h.api.applyKey(c),h);
   const events=await h.history(principal),state=replayProofKeys(events),generation=principal==='local_worker'?h.generation:null;
   for(const epoch of [1,2]){const ref=proofReference(state,epoch);selectProofKey(events,ref,new Date(begin).toISOString(),new Date(begin).toISOString(),generation);const [r]=await db.$queryRaw<any[]>`SELECT bootstrap_proof_reference(${h.b.workspaceId}::uuid,${JSON.stringify(ref)}::jsonb,${new Date(begin)},${JSON.stringify(generation)}::jsonb) AS value`;assert.ok(r.value);await assert.rejects(db.$queryRaw`SELECT bootstrap_proof_reference(${h.b.workspaceId}::uuid,${JSON.stringify(ref)}::jsonb,${new Date(end)},${JSON.stringify(generation)}::jsonb)`);}
   await new Promise(r=>setTimeout(r,Math.max(0,end-Date.now()+20)));
   if(initial==='adopt')success(await h.api.applyKey(await h.command(principal,'retire',{targetEpoch:1})),h);
   success(await h.api.applyKey(await h.command(principal,'cutover',{targetEpoch:2})),h);success(await h.api.applyKey(await h.command(principal,'revoke',{targetEpoch:2})),h);
   assert.equal((await h.api.applyKey(await h.command(principal,'revoke',{targetEpoch:2}))).ok,false);
   const final=replayProofKeys(await h.history(principal));assert.equal(final.highWater,2);assert.equal(final.generations[1].state,'revoked');
   const [r]=await db.$queryRaw<any[]>`SELECT bootstrap_proof_replay(${JSON.stringify(await h.history(principal))}::jsonb) AS value`;assert.deepEqual(r.value,final);
  }}
 });
 await t.test('wrong purpose material reuse and reverse root reuse deny',async()=>{
  const h=await fresh();success(await h.api.applyKey(await h.command()),h);
  for(const material of [materials[0],issuerMaterial])assert.equal((await h.api.applyKey(await h.command('roost_server','create',{material}))).ok,false);
  await assert.rejects(db.$transaction(tx=>tx.trustedProviderTicketKey.update({where:{workspaceId:h.b.workspaceId},data:{publicKeyDigest:materials[0].publicKeyDigest}}),{isolationLevel:'Serializable'}));
  const c=await h.command('roost_server');(c.intent.scope as any).purpose='worker-bootstrap-owner-ticket-v1';assert.equal((await h.api.applyKey(c)).ok,false);
 });
 await t.test('reservation binding rejects owner decision roots generations tickets request and history drift',async()=>{
  const h=await fresh();await h.seed();const c=await h.attachment();success(await h.api.attach(c),h);
  for(const mutate of [(a:any)=>a.ownerId=randomUUID(),(a:any)=>a.decisionRevision++,(a:any)=>a.workspaceId=randomUUID(),(a:any)=>a.installationId=randomUUID(),(a:any)=>a.generation.hostId=randomUUID(),(a:any)=>a.generation.hostGeneration=randomUUID(),(a:any)=>a.generation.installationGeneration=randomUUID(),(a:any)=>a.ticketId=randomUUID(),(a:any)=>a.requestId=randomUUID(),(a:any)=>a.enrollmentGeneration++,(a:any)=>a.worker.historyDigest='f'.repeat(64),(a:any)=>a.server.revision++]){
   const v=structuredClone(c);mutate(v.attachment);const before=await snapshot();assert.equal((await h.api.attach(v)).ok,false);assert.equal((await h.api.inspect(v.attachment)).ok,false);assert.deepEqual(await snapshot(),before);
  }
 });
 await t.test('twenty independent PostgreSQL writers have exactly one winner',async()=>{
  const h=await fresh(),c=await h.command(),pids=await Promise.all(clients.map(c=>c.$queryRaw<any[]>`SELECT pg_backend_pid() AS pid`));assert.equal(new Set(pids.flat().map(r=>r.pid)).size,20);
  const results=await Promise.all(clients.map(client=>createPrismaProofAuthorityStore(h.client(client)).applyKey({...c,operationId:randomUUID()})));
  assert.equal(results.filter(r=>r.ok).length,1,JSON.stringify(h.errors));assert.equal((await h.history('local_worker')).length,1);assert.equal(new Set(h.trace.filter(r=>r.mode==='write').map(r=>r.pid)).size,20);
 });
 await t.test('twenty pure readers and exact replay perform no business writes',async()=>{
  const h=await fresh();await h.seed();const c=await h.attachment();success(await h.api.attach(c),h);const before=await snapshot(),start=h.trace.length;
  const results=await Promise.all(clients.map(client=>createPrismaProofAuthorityStore(h.client(client)).attach(c)));assert.ok(results.every(r=>r.ok&&r.idempotent));assert.deepEqual(await snapshot(),before);assert.ok(h.trace.slice(start).every(r=>r.mode==='read'));
 });
 await t.test('all 19 functions 59 triggers and 18 foreign keys are pinned and restored after tamper',async()=>{
  assert.equal(proofPersistenceFunctions.length,19);assert.equal(proofPersistenceTriggers.length,59);assert.equal(proofPersistenceForeignKeys.length,18);
  async function corrupt(sql:string){let denied=false;await assert.rejects(db.$transaction(async tx=>{await tx.$executeRawUnsafe(sql);try{await requireProofPersistenceGuards(tx);}catch{denied=true;}throw Error('rollback catalog probe');},{timeout:60000}));assert.ok(denied,sql);await guard();}
  for(const f of proofPersistenceFunctions)await corrupt(`ALTER FUNCTION ${f.name}(${f.args}) SET search_path TO public`);
  for(const g of proofPersistenceTriggers)await corrupt(`ALTER TABLE ${g.table} DISABLE TRIGGER ${g.name}`);
  const keys=await db.$queryRaw<any[]>`SELECT conname,conrelid::regclass::text AS tbl FROM pg_constraint WHERE contype='f' AND conrelid IN ('bootstrap_proof_key_history'::regclass,'bootstrap_proof_attachments'::regclass,'bootstrap_proof_ticket_links'::regclass,'bootstrap_proof_write_receipts'::regclass)`;assert.equal(keys.length,18);
  for(const k of keys)await corrupt(`ALTER TABLE ${k.tbl} DROP CONSTRAINT "${k.conname}"`);
  await corrupt("CREATE OR REPLACE FUNCTION bootstrap_proof_digest(v jsonb) RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$ BEGIN RETURN repeat('a',64); END $$");
  await corrupt('SET LOCAL session_replication_role=replica');
 });
 await t.test('replica and shadow search path cannot provide public authority',async()=>{
  const h=await fresh();await h.seed();const c=await h.attachment();success(await h.api.attach(c),h);
  for(const setting of ['SET LOCAL session_replication_role=replica','SET LOCAL search_path=public,pg_catalog'])await assert.rejects(db.$transaction(async tx=>{await tx.$executeRawUnsafe(setting);return readCanonicalProofAuthority(tx,c.attachment);},{isolationLevel:'Serializable'}));
 });
 await t.test('key and attachment rollback at child Event receipt and source phases leaves zero writes',async()=>{
  for(const kind of ['key','attachment'])for(const phase of ['child','event','receipt','source']){const h=await fresh();if(kind==='attachment')await h.seed();const c=kind==='key'?await h.command():await h.attachment();
   const table=phase==='child'?(kind==='key'?'bootstrap_proof_key_history':'bootstrap_proof_attachments'):phase==='event'?'events':phase==='receipt'?'bootstrap_proof_write_receipts':'ready_source_fence';
   const before=await snapshot();await db.$executeRawUnsafe(`CREATE TRIGGER zz_native_proof_fault AFTER ${phase==='source'?'UPDATE':'INSERT'} ON ${table} FOR EACH ROW EXECUTE FUNCTION native_proof_fail()`);
   try{const r=kind==='key'?await h.api.applyKey(c):await h.api.attach(c);assert.equal(r.ok,false);}finally{await db.$executeRawUnsafe(`DROP TRIGGER zz_native_proof_fault ON ${table}`);}
   assert.deepEqual(await snapshot(),before);
  }
 });
 await t.test('pre-COMMIT connection loss and rollback are nonretryable with no committed operation',async()=>{
  for(const kind of ['key','attachment'])for(const fault of ['insert','precommit','connection']){const h=await fresh();if(kind==='attachment')await h.seed();const c=kind==='key'?await h.command():await h.attachment(),before=await snapshot();h.controls.fault=fault;
   const api=createPrismaProofAuthorityStore(h.client(clients[0]));uncertain(kind==='key'?await api.applyKey(c):await api.attach(c));assert.equal(h.hits(),1);assert.deepEqual(await snapshot(),before);assert.equal(h.trace.filter(r=>r.mode==='write').length,kind==='key'?1:3);
  }
 });
 await t.test('real deferred COMMIT failure and Prisma false success cannot claim persistence',async()=>{
  for(const kind of ['key','attachment']){const h=await fresh();if(kind==='attachment')await h.seed();const c=kind==='key'?await h.command():await h.attachment(),before=await snapshot();
   h.controls.hook=async tx=>{await tx.$executeRaw`SET CONSTRAINTS native_proof_deferred DEFERRED`;await tx.$executeRaw`INSERT INTO native_proof_commit_probe VALUES(1)`;};
   await db.$executeRawUnsafe('CREATE TABLE native_proof_commit_probe(n int)');await db.$executeRawUnsafe('CREATE CONSTRAINT TRIGGER native_proof_deferred AFTER INSERT ON native_proof_commit_probe DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION native_proof_fail()');
   try{uncertain(kind==='key'?await h.api.applyKey(c):await h.api.attach(c));assert.deepEqual(await snapshot(),before);}finally{await db.$executeRawUnsafe('DROP TABLE native_proof_commit_probe');}
  }
 });
 await t.test('lost application ACK yields exactly one committed operation and manual read-only reconciliation',async()=>{
  for(const kind of ['key','attachment']){const h=await fresh();if(kind==='attachment')await h.seed();const c=kind==='key'?await h.command():await h.attachment();h.controls.fault='lost';uncertain(kind==='key'?await h.api.applyKey(c):await h.api.attach(c));h.controls.fault='';
   const before=await snapshot(),r=await h.api.inspectOperation(kind==='key'?'bootstrap_proof_key_history':'bootstrap_proof_attachments',c.operationId);assert.ok(r.ok&&r.operation);assert.deepEqual(await snapshot(),before);assert.equal(h.hits(),1);
  }
 });
 await t.test('two actual PostgreSQL post-COMMIT response cuts reconcile without retry',async()=>{
  assert.equal(process.env.WORKER_IDENTITY_NATIVE_FAULT_RELAY,'1');for(const kind of ['key','attachment']){const h=await fresh();if(kind==='attachment')await h.seed();const c=kind==='key'?await h.command():await h.attachment();h.controls.fault='cut';const api=createPrismaProofAuthorityStore(h.client(clients[0]));uncertain(kind==='key'?await api.applyKey(c):await api.attach(c));h.controls.fault='';
   const r=await h.api.inspectOperation(kind==='key'?'bootstrap_proof_key_history':'bootstrap_proof_attachments',c.operationId);assert.ok(r.ok&&r.operation);assert.equal(h.hits(),1);
  }
 });
 await t.test('missing mismatched and unavailable independent readback never become success',async()=>{
  for(const kind of ['key','attachment'])for(const fault of ['missing','mismatch','unavailable']){const h=await fresh();if(kind==='attachment')await h.seed();const c=kind==='key'?await h.command():await h.attachment();h.controls.fault=fault;
   // Arm only after this write: fixture creation must not masquerade as readback.
   const api=createPrismaProofAuthorityStore(h.client());uncertain(kind==='key'?await api.applyKey(c):await api.attach(c));h.controls.fault='';assert.equal(h.hits(),1);
   const r=await h.api.inspectOperation(kind==='key'?'bootstrap_proof_key_history':'bootstrap_proof_attachments',c.operationId);assert.ok(r.ok&&r.operation);
  }
 });
 await t.test('immutable history attachment audit and Event reject direct mutations',async()=>{
  const h=await fresh();await h.seed();const c=await h.attachment();success(await h.api.attach(c),h);const before=await snapshot();
  for(const table of ['bootstrap_proof_key_history','bootstrap_proof_attachments','bootstrap_proof_write_receipts'])for(const verb of [`UPDATE ${table} SET ${table==='bootstrap_proof_write_receipts'?'record_digest=record_digest':'record=record'}`,`DELETE FROM ${table}`,`TRUNCATE ${table} CASCADE`])await assert.rejects(db.$executeRawUnsafe(verb));
  await assert.rejects(db.$executeRaw`UPDATE events SET payload='{}'::jsonb WHERE id=${c.operationId}::uuid`);assert.deepEqual(await snapshot(),before);
  for(const sql of ["UPDATE bootstrap_proof_attachments SET record_bytes=decode('00','hex') WHERE id=$1::uuid",
   "UPDATE bootstrap_proof_write_receipts SET record_digest=repeat('f',64) WHERE operation_id=$1::uuid",
   "UPDATE bootstrap_proof_write_receipts SET writer_xid='999999' WHERE operation_id=$1::uuid",
   "UPDATE bootstrap_proof_write_receipts SET to_fence=9223372036854775807 WHERE operation_id=$1::uuid",
   "UPDATE events SET payload='{}'::jsonb WHERE id=$1::uuid",
   "DELETE FROM bootstrap_proof_write_receipts WHERE operation_id=$1::uuid"]){let reached=false,denied=false;
   await assert.rejects(db.$transaction(async tx=>{await tx.$executeRaw`SET LOCAL session_replication_role=replica`;await tx.$executeRawUnsafe(sql,c.operationId);await tx.$executeRaw`SET LOCAL session_replication_role=origin`;reached=true;
    try{await readProofOperation(tx,'bootstrap_proof_attachments',c.operationId);}catch{denied=true;}throw Error('rollback corrupt evidence probe');}));assert.ok(reached&&denied,sql);assert.deepEqual(await snapshot(),before);
  }
 });
 await t.test('migrations 81 through 85 retain real numeric receipts under migration 86',async()=>{
  const h=await nativeCompletionHarness(db,clients),v=await h.input(),r=await h.factory().complete(v);assert.ok(r.ok,JSON.stringify([...h.errors,...h.dispatch.errors]));assert.equal(h.writes.length,11);assert.equal((await h.fact()).completions,1);
  const inspect=await h.factory().inspect(v);assert.equal(inspect.completionRecorded,true);const before=await snapshot();assert.equal((await h.factory().inspect(v)).completionRecorded,true);assert.deepEqual(await snapshot(),before);
 });
 await t.test('source row locks prevent stale serializable writes even without extra numeric increments',async()=>{
  const h=await fresh();let release!:()=>void,started!:()=>void;const gate=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>started=r);
  const stale=clients[0].$transaction(async tx=>{await tx.$queryRaw`SELECT revision FROM ready_source_fence WHERE id=1`;started();await gate;await tx.$executeRaw`UPDATE ready_source_fence SET revision=revision WHERE id=1`;},{isolationLevel:'Serializable',timeout:60000});
  const rejected=assert.rejects(stale);await ready;await db.$transaction(tx=>tx.$executeRaw`UPDATE agent_hosts SET name=name WHERE id=${h.b.hostId}::uuid`,{isolationLevel:'Serializable'});release();await rejected;
 });
 // Privileged setup of inert legacy roots is deliberately separate from the
 // origin-mode reservation/link operations being qualified. No ticket is signed.
 async function inertTicket(h:Awaited<ReturnType<typeof fresh>>,a:any){const payload:any=structuredClone(h.ticket);payload.id=a.ticketId;payload.decisionId=a.decisionId;payload.intent.requestId=a.requestId;payload.intent.target.id=randomUUID();
  const record={signed:{payload,signature:'0'.repeat(128)},decision:{payload:{authority:'owner_reserved'},signature:'0'.repeat(128)}},digest=reviewDigest(payload);
  await prepare(db,tx=>tx.$executeRaw`INSERT INTO worker_bootstrap_tickets(id,workspace_id,host_id,owner_id,decision_id,request_id,generation,credential_epoch,target_id,predecessor_id,binding_digest,ticket_digest,record,record_digest,expires_at)
   VALUES(${a.ticketId}::uuid,${a.workspaceId}::uuid,${a.generation.hostId}::uuid,${a.ownerId}::uuid,${a.decisionId}::uuid,${a.requestId}::uuid,1,${payload.intent.target.epoch},${payload.intent.target.id}::uuid,NULL,${reviewDigest(h.b)},${digest},${JSON.stringify(record)}::jsonb,${reviewDigest(record)},${new Date(h.iso(3600000))})`);
  return {record,digest,targetId:payload.intent.target.id};}
 await t.test('owner recovery requires exact prior reservation terminal root and revoked predecessor key',async()=>{
  const h=await fresh();await h.seed();const first=await h.attachment();success(await h.api.attach(first),h);const old=await inertTicket(h,first.attachment);
  await prepare(db,async tx=>{await tx.apiKey.create({data:{id:old.targetId,workspaceId:h.b.workspaceId,name:'Inert revoked verifier',keyHash:reviewDigest(randomUUID()),keyPrefix:'synthetic',scopes:[],active:false,revokedAt:new Date(),workerHostId:h.b.hostId,workerInstallationId:h.b.installationId,workerBindingEpoch:1,expiresAt:new Date(h.iso(-1000))}});
   await tx.$executeRaw`INSERT INTO worker_bootstrap_lifecycle_events(id,ticket_id,revision,record,record_digest,writer_xid) VALUES(${randomUUID()}::uuid,${first.attachment.ticketId}::uuid,1,'{"state":"revoked"}'::jsonb,${reviewDigest({state:'revoked'})},pg_current_xact_id()::text)`;});
  success(await h.api.applyKey(await h.command('local_worker','revoke',{targetEpoch:1})),h);
  const begin=Date.now()+1500,end=begin+1000;success(await h.api.applyKey(await h.command('local_worker','stage',{targetEpoch:2,material:materials[2],activatesAt:new Date(begin).toISOString(),cutoverAt:new Date(end).toISOString()})),h);
  await new Promise(r=>setTimeout(r,Math.max(0,end-Date.now()+20)));success(await h.api.applyKey(await h.command('local_worker','cutover',{targetEpoch:2})),h);
  const c=await h.attachment(first.attachment);success(await h.api.attach(c),h);success(await h.api.inspect(c.attachment),h);
  for(const mutate of [(a:any)=>a.prior.ticketId=randomUUID(),(a:any)=>a.prior.requestId=randomUUID(),(a:any)=>a.prior.worker.historyDigest='e'.repeat(64),(a:any)=>a.enrollmentGeneration++]){const v=structuredClone(c);mutate(v.attachment);assert.equal((await h.api.attach(v)).ok,false);}
 });
 await t.test('legacy v1 v2 and unqualified v3 links remain intentionally denied',async()=>{
  const h=await fresh();await h.seed();const c=await h.attachment();success(await h.api.attach(c),h);const ticket=await inertTicket(h,c.attachment),attemptId=randomUUID();
  for(const version of ['worker-bootstrap-owner-ticket-v1','worker-bootstrap-owner-ticket-v2','worker-bootstrap-owner-ticket-v3']){
   ticket.record.signed.payload.version=version;ticket.record.signed.payload.intent.proofAuthority=c.attachment;
   await prepare(db,tx=>tx.$executeRaw`UPDATE worker_bootstrap_tickets SET record=${JSON.stringify(ticket.record)}::jsonb WHERE id=${c.attachment.ticketId}::uuid`);
   const record={version:'bootstrap-proof-ticket-link-v1',attachmentId:c.operationId,attachmentDigest:proofDigest(c.attachment),ticketId:c.attachment.ticketId,ticketEnvelopeDigest:ticket.digest,attemptId,sealDigest:'a'.repeat(64)},before=await snapshot();let reason='';
   await assert.rejects(db.$transaction(async tx=>{await tx.$executeRaw`SET LOCAL search_path=pg_catalog,public`;try{await tx.$executeRaw`INSERT INTO bootstrap_proof_ticket_links(id,attachment_id,ticket_id,attempt_id,workspace_id,host_id,enrollment_generation,record,record_bytes,record_digest,source_digest,writer_xid)
    VALUES(${randomUUID()}::uuid,${c.operationId}::uuid,${c.attachment.ticketId}::uuid,${attemptId}::uuid,${h.b.workspaceId}::uuid,${h.b.hostId}::uuid,1,${JSON.stringify(record)}::jsonb,${proofBytes(record)},${proofDigest(record)},bootstrap_proof_sources(${h.b.workspaceId}::uuid),pg_current_xact_id()::text)`;}catch(e:any){reason=e.meta?.message??e.message;throw e;}},{isolationLevel:'Serializable'}));
   assert.match(reason,version.endsWith('v3')?/bootstrap_proof_v3_seal_unavailable/:/bootstrap_proof_legacy_ticket_blocked/);assert.deepEqual(await snapshot(),before);
  }
 });
 await t.test('source changes before final check roll back rather than accepting stale authority',async()=>{
  const h=await fresh(),c=await h.command(),before=await snapshot();h.controls.hook=async tx=>{await tx.$executeRaw`UPDATE agent_hosts SET name='changed inert source' WHERE id=${h.b.hostId}::uuid`;};uncertain(await h.api.applyKey(c));assert.deepEqual(await snapshot(),before);
 });
 assert.equal(effects,0);await guard();assert.equal(sourceHash(),startedSourceHash,'Native sources changed during run');console.log(JSON.stringify({publicOnly:true,privateCryptoCalls:effects,functions:19,triggers:59,foreignKeys:18,activationFlags:false,nativeSourceSHA256:startedSourceHash}));
});
