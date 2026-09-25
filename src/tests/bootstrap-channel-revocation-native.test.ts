import test from 'node:test';
import assert from 'node:assert/strict';
import crypto,{randomUUID} from 'node:crypto';
import net from 'node:net';import tls from 'node:tls';import http from 'node:http';import https from 'node:https';
import dns from 'node:dns';import childProcess from 'node:child_process';
import {PrismaClient} from '@prisma/client';
import {ticketFixture,owned,prepare,type Db} from './bootstrap-ticket-native-fixture';
import {createPrismaBootstrapChannelStore,ChannelReconciliationRequired} from '../modules/api-keys/bootstrap-channel-store';
import type {ChannelTransition} from '../modules/api-keys/bootstrap-channel-persistence-contract';
import {decisionAttestationGuards,decisionAttestationHelpers} from '../modules/api-keys/decision-attestation-adapter';
import {reviewDigest} from '../modules/agent-runtime/task-review-contract';

const uncertain=(e:unknown)=>e instanceof ChannelReconciliationRequired&&e.code==='reconciliation_required'&&e.retryable===false&&e.deliveryUnknown===true;
const tables=['worker_transport_generations','worker_transport_bootstrap_grants','worker_transport_history','worker_transport_heads','worker_transport_audit',
 'worker_transport_write_audit','decision_authority_events','decision_attestation_write_receipts','events','ready_source_fence'];

async function harness(db:PrismaClient,writer:PrismaClient,n:number){
 const f=await ticketFixture(db);await f.store.register(f.registration);
 for(let i=0;i<n;i++)await db.$transaction(async tx=>{
  // Inert proposal content only: suspend the older policy BEFORE ROW guards,
  // as in the attestation fixture. All migration-83 triggers remain active.
  const guards=await tx.$queryRaw<any[]>`SELECT tgname AS name FROM pg_trigger WHERE tgrelid='decision_revisions'::regclass AND NOT tgisinternal AND tgtype & 3=3`;
  for(const g of guards){assert.match(g.name,/^[a-z_]+$/);await tx.$executeRawUnsafe(`ALTER TABLE decision_revisions DISABLE TRIGGER ${g.name}`);}
  const id=randomUUID();await tx.$executeRaw`INSERT INTO decisions(id,workspace_id,title,status,source,authority_revision,updated_at)
   VALUES(${id}::uuid,${f.b.workspaceId}::uuid,'Inert revoke source','proposed','roost_decision',1,clock_timestamp())`;
  await tx.$executeRaw`INSERT INTO decision_revisions(decision_id,workspace_id,version,body,actor_user_id,request_id,request_hash)
   VALUES(${id}::uuid,${f.b.workspaceId}::uuid,1,'{}'::jsonb,${f.ticket.ownerId}::uuid,${randomUUID()}::uuid,${reviewDigest({})})`;
  await tx.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`;
  for(const g of guards)await tx.$executeRawUnsafe(`ALTER TABLE decision_revisions ENABLE TRIGGER ${g.name}`);
 },{isolationLevel:'Serializable'});
 assert.equal((await db.$queryRaw<any[]>`SELECT count(*)::int AS n FROM decisions WHERE workspace_id=${f.b.workspaceId}::uuid AND authority_revision=1`)[0].n,n);
 const operationId=randomUUID(),command={ticketId:f.identity.ticketId,operationId,expectedRevision:1,action:'revoke'};
 const calls:{read:boolean;sql:string}[]=[],errors:string[]=[];let writes=0,transactions=0,readbacks=0,observed:ChannelTransition|undefined;
 let from='',through='',xid='',fault='';let beforeRead:((tx:Db)=>Promise<void>)|undefined,afterCommit:(()=>Promise<void>)|undefined;
 const client:any={$transaction:async(work:any,options:any)=>{
  const read=options.isolationLevel==='RepeatableRead',falseAck=Error('false ACK');let result:any;
  if(read)readbacks++;else transactions++;
  try{
   result=await writer.$transaction(async tx=>{
    if(read)await beforeRead?.(tx);
    if(!read&&fault==='wire')await tx.$queryRawUnsafe("SELECT 'native_drop_commit_response'");
    const proxy=new Proxy(tx,{get(target,key){const value=Reflect.get(target,key);
     if(key==='$executeRaw'||key==='$queryRaw')return async(...args:any[])=>{
      const sql=args[0].join('?').replace(/\s+/g,' ').trim();calls.push({read,sql});
      if(read)assert.ok(sql==='SET TRANSACTION READ ONLY'||/^(SELECT|WITH target AS)\b/.test(sql));
      if(sql.startsWith('WITH v AS'))writes++;
      const rows=await (value as any).apply(target,args);
      if(sql.includes('AS channel_fence')&&!read)from=rows[0].channel_fence;
      if(sql.includes('channel_revoke_witness')){through=rows[0].toFence;xid=rows[0].writerXid;}
      if(sql==='SET TRANSACTION READ ONLY')assert.deepEqual(await tx.$queryRaw`SELECT current_setting('transaction_read_only') AS ro,current_setting('transaction_isolation') AS isolation`,[{ro:'on',isolation:'repeatable read'}]);
      return rows;
     };return typeof value==='function'?value.bind(target):value;
    }});
    result=await work(proxy);if(!read){observed=result;
     if(fault==='false')throw falseAck;
     if(fault==='precommit')throw Error('explicit pre-COMMIT rollback');
     if(fault==='connection'){const [{pid}]=await tx.$queryRaw<any[]>`SELECT pg_backend_pid() AS pid`;
      assert.equal((await db.$queryRaw<any[]>`SELECT pg_terminate_backend(pid) AS killed FROM pg_stat_activity WHERE pid=${pid} AND datname=current_database()`)[0].killed,true);}
     if(fault==='deferred'){
      await tx.$executeRaw`SET LOCAL session_replication_role=replica`;
      await tx.$executeRaw`DELETE FROM worker_transport_audit WHERE history_id=${operationId}::uuid`;
      await tx.$executeRaw`SET LOCAL session_replication_role=origin`;
     }
    }return result;
   },{...options,maxWait:20000,timeout:30000});
   if(!read){await afterCommit?.();if(fault==='lost')throw Error('lost post-COMMIT caller response');}
   return result;
  }catch(e:any){if(e===falseAck)return result;errors.push(String(e.meta?.code??e.code??'error')+':'+String(e.meta?.message??e.message).slice(0,600));throw e;}
 }};
 const store=createPrismaBootstrapChannelStore(client);
 const record=async()=>{const rows=await db.$queryRaw<any[]>`SELECT record FROM worker_transport_history WHERE id=${operationId}::uuid`;return rows[0]?.record as ChannelTransition|undefined;};
 return {f,n,command,store,record,calls,errors,observed:()=>observed!,witness:()=>({from,through,xid}),counts:()=>({writes,transactions,readbacks}),
  fault:(v:string)=>fault=v,beforeRead:(fn:typeof beforeRead)=>beforeRead=fn,afterCommit:(fn:typeof afterCommit)=>afterCommit=fn};
}
type Harness=Awaited<ReturnType<typeof harness>>;

test('native channel revocation committed readback',{skip:!process.env.WORKER_IDENTITY_NATIVE_DATABASE,timeout:850000},async t=>{
 const db=new PrismaClient(),url=new URL(process.env.DATABASE_URL!);url.searchParams.set('connection_limit','1');
 const writer=new PrismaClient({datasources:{db:{url:url.toString()}}});
 await db.$connect();await writer.$connect();await owned(db);await owned(writer);
 t.after(async()=>{await writer.$disconnect();await db.$disconnect();});
 let effects=0;const forbid=()=>{effects++;throw Error('non-database effect forbidden');};
 for(const m of ['connect','createConnection'] as const)t.mock.method(net,m,forbid);t.mock.method(net.Server.prototype,'listen',forbid);t.mock.method(tls,'connect',forbid);
 for(const mod of [http,https])for(const m of ['request','get'] as const)t.mock.method(mod,m,forbid);
 for(const m of ['lookup','resolve','resolve4','resolve6'] as const){t.mock.method(dns,m,forbid);t.mock.method(dns.promises,m,forbid);}
 t.mock.method(globalThis,'fetch',forbid);for(const m of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'] as const)t.mock.method(childProcess,m,forbid);
 for(const m of ['generateKeyPair','generateKeyPairSync','createPrivateKey','sign'] as const)t.mock.method(crypto,m,forbid);
 const fresh=(n=1)=>harness(db,writer,n);
 async function snapshot(){const values=[];for(const table of tables)values.push(await db.$queryRawUnsafe(`SELECT count(*)::int AS n,md5(coalesce(string_agg(to_jsonb(t)::text,'|' ORDER BY to_jsonb(t)::text),'')) AS digest FROM ${table} t`));return values;}
 async function success(h:Harness){let result;try{result=await h.store.transition(h.command);}catch(e){console.log(JSON.stringify({ownedRevokeErrors:h.errors}));throw e;}
  assert.deepEqual(result,await h.record());assert.equal(result.action,'revoke');assert.equal(h.counts().writes,1);return result;}
 async function proof(h:Harness){
  const w=h.witness(),rows=await db.$queryRaw<any[]>`SELECT table_name AS tbl,row_id AS rid,writer_xid AS xid,fence_revision::text AS fence,row_digest AS digest
   FROM worker_transport_write_audit WHERE writer_xid=${w.xid} ORDER BY table_name`;
  assert.equal(rows.length,3);const find=(tbl:string)=>rows.find(r=>r.tbl===tbl)!;
  const H=BigInt(w.from)+3n,A=H+BigInt(h.n)+1n,T=A+BigInt(h.n);
  assert.equal(find('worker_transport_heads').fence,String(H));assert.equal(find('worker_transport_history').fence,String(A));
  assert.equal(find('worker_transport_audit').fence,String(A));assert.equal(w.through,String(T));
  const children=await db.$queryRaw<any[]>`SELECT d.*,p.fence_revision::text AS receipt_fence,p.writer_xid AS receipt_xid,
   (p.row_digest=bootstrap_lifecycle_digest(to_jsonb(d)) AND d.record_digest=decision_attestation_digest('owner-decision-authority-event-v1',to_jsonb(d)-'record_digest')
    AND e.payload=jsonb_build_object('table',p.table_name,'rowId',p.row_id,'operation',p.operation,'rowDigest',p.row_digest,'fence',p.fence_revision::text,'writerXid',p.writer_xid,'launchAuthority',false)) AS verified
   FROM decision_authority_events d JOIN decision_attestation_write_receipts p ON p.row_id=d.id::text AND p.table_name='decision_authority_events'
   JOIN events e ON e.id=p.event_id WHERE d.writer_xid=${w.xid} ORDER BY d.fence_revision`;
  assert.equal(children.length,2*h.n);
  for(const [i,c] of children.entries()){
   assert.equal(c.receipt_xid,w.xid);assert.equal(c.verified,true);assert.equal(c.action,'source_change');
   assert.equal(c.receipt_fence,String(i<h.n?H+BigInt(i)+1n:A+BigInt(i-h.n)+1n));
   assert.equal(c.source_table,i<h.n?'worker_transport_heads':'worker_transport_history');
   if(i>=h.n){const prior=children.slice(0,h.n).find(p=>p.decision_id===c.decision_id);assert.ok(prior);assert.equal(c.previous_digest,prior.record_digest);assert.equal(c.revision,prior.revision+1n);}
  }
  const source=await db.$queryRaw<any[]>`SELECT table_name AS tbl,fence_revision::text AS fence FROM decision_attestation_write_receipts
   WHERE writer_xid=${w.xid} AND table_name IN ('worker_transport_heads','worker_transport_history') ORDER BY table_name`;
  assert.deepEqual(source,[{tbl:'worker_transport_heads',fence:String(H)},{tbl:'worker_transport_history',fence:String(A)}]);
  const before=await snapshot(),start=h.calls.length;
  assert.deepEqual(await h.store.reconcileRevocation(h.observed()),h.observed());assert.deepEqual(await h.store.reconcileRevocation(h.observed()),h.observed());
  assert.deepEqual(await snapshot(),before);assert.ok(h.calls.slice(start).every(c=>c.read));assert.equal(h.counts().writes,1);
  console.log(JSON.stringify({nativeRevokeProof:{N:h.n,F:w.from,H:String(H),A:String(A),T:String(T),nativeReceipts:3,sourceReceipts:2,authorityChildren:children.length,exactCommittedReadback:true,readOnlyReconciliation:true}}));
 }
 // Committed corruptions are restricted to this owned synthetic DB. Capture and
 // restore the exact selected rows between cases; runtime reads never repair them.
 async function corruption(h:Harness,label:string,selections:{table:string;where:string;args:any[]}[],change:(tx:Db)=>Promise<unknown>){
  const backups:{row:unknown}[][]=[];for(const s of selections){assert.ok(tables.includes(s.table));backups.push(await db.$queryRawUnsafe<any[]>(`SELECT to_jsonb(t) AS row FROM ${s.table} t WHERE ${s.where}`,...s.args));}
  try{
   await prepare(db,change);const before=await snapshot();
   await assert.rejects(h.store.reconcileRevocation(h.observed()),uncertain,label);assert.deepEqual(await snapshot(),before,label);
  }finally{
   await prepare(db,async tx=>{for(const [i,s] of selections.entries()){
    await tx.$executeRawUnsafe(`DELETE FROM ${s.table} WHERE ${s.where}`,...s.args);
    await tx.$executeRawUnsafe(`INSERT INTO ${s.table} SELECT * FROM jsonb_populate_recordset(NULL::${s.table},$1::jsonb)`,JSON.stringify(backups[i].map(r=>r.row)));
   }});
  }
 }
 for(const n of [0,1,3])await t.test(`exact native revoke and shared trigger epochs N=${n}`,async()=>{
  const h=await fresh(n);await success(h);await proof(h);
  assert.equal(h.calls.some(c=>c.sql.includes('AS channel_revoke_lineage')),n>0);
 });
 await t.test('native receipt and exact transport root binding corruptions deny without repair',async()=>{
  const h=await fresh();await success(h);const id=h.command.operationId;
  const cases:[string,string,string,any[],string,any[]][]=[
   ['native missing','worker_transport_write_audit',"table_name='worker_transport_history' AND row_id=$1",[id],"DELETE FROM worker_transport_write_audit WHERE table_name='worker_transport_history' AND row_id=$1",[id]],
   ['native XID','worker_transport_write_audit',"table_name='worker_transport_history' AND row_id=$1",[id],"UPDATE worker_transport_write_audit SET writer_xid='999999' WHERE table_name='worker_transport_history' AND row_id=$1",[id]],
   ['native digest','worker_transport_write_audit',"table_name='worker_transport_history' AND row_id=$1",[id],"UPDATE worker_transport_write_audit SET row_digest=repeat('f',64) WHERE table_name='worker_transport_history' AND row_id=$1",[id]],
   ['native duplicate','worker_transport_write_audit',"table_name='worker_transport_history' AND row_id=$1",[id],"INSERT INTO worker_transport_write_audit SELECT generation_id,table_name,row_id,'999999',row_digest,fence_revision FROM worker_transport_write_audit WHERE table_name='worker_transport_history' AND row_id=$1",[id]],
   ['wrong head','worker_transport_heads','workspace_id=$1::uuid',[h.f.b.workspaceId],"UPDATE worker_transport_heads SET record_digest=repeat('f',64) WHERE workspace_id=$1::uuid",[h.f.b.workspaceId]],
   ['predecessor','worker_transport_history','id=$1::uuid',[id],"UPDATE worker_transport_history SET previous_digest=repeat('f',64) WHERE id=$1::uuid",[id]],
   ['generation','worker_transport_generations','id=$1::uuid',[h.f.snapshot.generation],"UPDATE worker_transport_generations SET identity_digest=repeat('f',64) WHERE id=$1::uuid",[h.f.snapshot.generation]],
   ['grant','worker_transport_bootstrap_grants','ticket_id=$1::uuid',[h.f.identity.ticketId],"UPDATE worker_transport_bootstrap_grants SET record_digest=repeat('f',64) WHERE ticket_id=$1::uuid",[h.f.identity.ticketId]]
  ];
  for(const [label,table,where,args,sql,params] of cases)await corruption(h,label,[{table,where,args}],tx=>tx.$executeRawUnsafe(sql,...params));
  console.log(JSON.stringify({nativeTransportCorruptions:cases.length,denied:cases.length}));
 });
 await t.test('source receipt missing duplicate foreign stale replay gap and authority predecessor deny',async()=>{
  const h=await fresh(3);await success(h);const xid=h.witness().xid;
  const [p]=await db.$queryRaw<any[]>`SELECT * FROM decision_attestation_write_receipts WHERE writer_xid=${xid} AND table_name='decision_authority_events' ORDER BY fence_revision LIMIT 1`;
  const selection={table:'decision_attestation_write_receipts',where:'row_id=$1',args:[p.row_id]};
  const event={table:'events',where:'resource_id=$1 AND type=\'decision.attestation.write\'',args:[p.row_id]};
  for(const [label,sql] of [
   ['missing','DELETE FROM decision_attestation_write_receipts WHERE id=$1::uuid'],
   ['foreign XID',"UPDATE decision_attestation_write_receipts SET writer_xid='999999' WHERE id=$1::uuid"],
   ['stale',"UPDATE decision_attestation_write_receipts SET fence_revision=1 WHERE id=$1::uuid"],
   ['gap','UPDATE decision_attestation_write_receipts SET fence_revision=fence_revision+1 WHERE id=$1::uuid'],
   ['digest',"UPDATE decision_attestation_write_receipts SET row_digest=repeat('f',64) WHERE id=$1::uuid"],
   ['unrelated',"UPDATE decision_attestation_write_receipts SET table_name='api_keys' WHERE id=$1::uuid"]
  ])await corruption(h,label,[selection],tx=>tx.$executeRawUnsafe(sql,p.id));
  await corruption(h,'duplicate receipt',[selection,event],async tx=>{
   const eid=randomUUID();await tx.$executeRaw`INSERT INTO events SELECT (jsonb_populate_record(NULL::events,to_jsonb(e)||jsonb_build_object('id',${eid}::text))).* FROM events e WHERE id=${p.event_id}::uuid`;
   await tx.$executeRaw`INSERT INTO decision_attestation_write_receipts SELECT (jsonb_populate_record(NULL::decision_attestation_write_receipts,to_jsonb(r)||jsonb_build_object('id',${randomUUID()}::text,'event_id',${eid}::text))).* FROM decision_attestation_write_receipts r WHERE id=${p.id}::uuid`;
  });
  await corruption(h,'authority predecessor',[{table:'decision_authority_events',where:'id=$1::uuid',args:[p.row_id]}],
   tx=>tx.$executeRaw`UPDATE decision_authority_events SET previous_digest=${'f'.repeat(64)} WHERE id=${p.row_id}::uuid`);
  await corruption(h,'replayed internally consistent foreign XID',[selection,event],async tx=>{
   await tx.$executeRaw`UPDATE decision_attestation_write_receipts SET writer_xid='999999' WHERE id=${p.id}::uuid`;
   await tx.$executeRaw`UPDATE events SET payload=jsonb_set(payload,'{writerXid}','"999999"'::jsonb) WHERE id=${p.event_id}::uuid`;
  });
  console.log(JSON.stringify({nativeSourceCorruptions:9,denied:9}));
 });
 await t.test('native channel Event and attestation Event bindings are exact',async()=>{
  const h=await fresh();await success(h);
  const events=await db.$queryRaw<any[]>`SELECT event_id AS id FROM worker_transport_audit WHERE history_id=${h.command.operationId}::uuid
   UNION ALL SELECT event_id FROM decision_attestation_write_receipts WHERE writer_xid=${h.witness().xid}`;
  for(const {id} of events)await corruption(h,'Event payload',[{table:'events',where:'id=$1::uuid',args:[id]}],tx=>tx.$executeRaw`UPDATE events SET payload='{}'::jsonb WHERE id=${id}::uuid`);
  assert.equal(events.length,5);
 });
 await t.test('current fence gap and regression cannot rebase committed proof',async()=>{
  const h=await fresh();await success(h);
  for(const delta of [-1,1])await corruption(h,'fence drift',[{table:'ready_source_fence',where:'id=1',args:[]}],tx=>tx.$executeRaw`UPDATE ready_source_fence SET revision=revision+${delta} WHERE id=1`);
 });
 await t.test('false ACK and known pre-COMMIT loss require reconciliation without retry',async()=>{
  for(const fault of ['false','precommit','connection','deferred']){
   const h=await fresh();h.fault(fault);await assert.rejects(h.store.transition(h.command),uncertain,fault);
   assert.equal(await h.record(),undefined);assert.equal(h.counts().writes,1);assert.equal(h.counts().transactions,1);
   h.fault('');await assert.rejects(h.store.reconcileRevocation(h.observed()),uncertain);
  }
 });
 await t.test('lost post-COMMIT caller response needs exact explicit read-only reconciliation',async()=>{
  const h=await fresh();h.fault('lost');await assert.rejects(h.store.transition(h.command),uncertain);
  assert.ok(await h.record());h.fault('');await proof(h);assert.equal(h.counts().transactions,1);
 });
 await t.test('two real PostgreSQL post-COMMIT response cuts never retry and reconcile exact writes',async()=>{
  assert.equal(process.env.WORKER_IDENTITY_NATIVE_FAULT_RELAY,'1');
  for(const n of [1,3]){const h=await fresh(n);h.fault('wire');await assert.rejects(h.store.transition(h.command),uncertain);
   assert.ok(await h.record());h.fault('');await proof(h);assert.equal(h.counts().transactions,1);}
 });
 await t.test('incomplete actual committed readback fails, and read cannot repair',async()=>{
  const h=await fresh();h.afterCommit(()=>prepare(db,tx=>tx.$executeRaw`DELETE FROM worker_transport_write_audit WHERE table_name='worker_transport_history' AND row_id=${h.command.operationId}`));
  await assert.rejects(h.store.transition(h.command),uncertain);assert.ok(await h.record());const before=await snapshot();
  await assert.rejects(h.store.reconcileRevocation(h.observed()),uncertain);assert.deepEqual(await snapshot(),before);assert.equal(h.counts().writes,1);
 });
 await t.test('unrelated native source change between COMMIT and readback fails closed',async()=>{
  const h=await fresh();h.afterCommit(()=>db.$transaction(tx=>tx.$executeRaw`UPDATE workspaces SET name=name WHERE id=${h.f.b.workspaceId}::uuid`,{isolationLevel:'Serializable'}).then(()=>{}));
  await assert.rejects(h.store.transition(h.command),uncertain);assert.ok(await h.record());await assert.rejects(h.store.reconcileRevocation(h.observed()),uncertain);
  assert.equal(h.counts().writes,1);
 });
 await t.test('replica role and mismatched guard/helper metadata deny',async()=>{
  const h=await fresh();await success(h);h.beforeRead(tx=>tx.$executeRaw`SET LOCAL session_replication_role=replica`.then(()=>{}));
  await assert.rejects(h.store.reconcileRevocation(h.observed()),uncertain);h.beforeRead(undefined);
  const g=decisionAttestationGuards.find(g=>g.name==='zz_decision_attestation_audit'&&g.table==='worker_transport_heads')!;assert.ok(g);
  try{await db.$executeRawUnsafe(`ALTER TABLE ${g.table} DISABLE TRIGGER ${g.name}`);await assert.rejects(h.store.reconcileRevocation(h.observed()),uncertain);}
  finally{await db.$executeRawUnsafe(`ALTER TABLE ${g.table} ENABLE TRIGGER ${g.name}`);}
  assert.ok(decisionAttestationHelpers.some(h=>h.name==='decision_attestation_digest'));
  try{await db.$executeRawUnsafe('ALTER FUNCTION decision_attestation_digest(text,jsonb) STABLE');await assert.rejects(h.store.reconcileRevocation(h.observed()),uncertain);}
  finally{await db.$executeRawUnsafe('ALTER FUNCTION decision_attestation_digest(text,jsonb) IMMUTABLE');}
  assert.deepEqual(await h.store.reconcileRevocation(h.observed()),h.observed());
 });
 await t.test('conflicting exact operation and stale head cannot reconcile',async()=>{
  const h=await fresh();await success(h);const r=h.observed();
  for(const input of [{...r,id:randomUUID()},{...r,revision:r.revision+1},{...r,grantId:randomUUID()},{...r,previousId:randomUUID()},{...r,at:new Date(Date.parse(r.at)+1).toISOString()}])
   await assert.rejects(h.store.reconcileRevocation(input),uncertain);
  await corruption(h,'stale head',[{table:'worker_transport_heads',where:'workspace_id=$1::uuid',args:[h.f.b.workspaceId]}],tx=>tx.$executeRaw`DELETE FROM worker_transport_heads WHERE workspace_id=${h.f.b.workspaceId}::uuid`);
 });
 await t.test('native guarded receipts refuse direct mutation and no external effects occur',async()=>{
  const h=await fresh();await success(h);const before=await snapshot();
  await assert.rejects(db.$transaction(tx=>tx.$executeRaw`DELETE FROM worker_transport_write_audit WHERE writer_xid=${h.witness().xid}`,{isolationLevel:'Serializable'}));
  await assert.rejects(db.$transaction(tx=>tx.$executeRaw`DELETE FROM decision_attestation_write_receipts WHERE writer_xid=${h.witness().xid}`,{isolationLevel:'Serializable'}));
  assert.deepEqual(await snapshot(),before);assert.equal(effects,0);
 });
});
