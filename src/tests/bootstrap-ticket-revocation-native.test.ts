import test from 'node:test';import assert from 'node:assert/strict';import crypto,{randomUUID} from 'node:crypto';
import net from 'node:net';import tls from 'node:tls';import http from 'node:http';import https from 'node:https';import dns from 'node:dns';import childProcess from 'node:child_process';
import {PrismaClient} from '@prisma/client';
import {ticketFixture,owned,prepare,hash,type Db} from './bootstrap-ticket-native-fixture';
import {createCanonicalBootstrapAuthoritySource,CanonicalBootstrapBlocked} from '../modules/api-keys/worker-bootstrap-authority-source';
import {TicketLifecycleUnknown} from '../modules/api-keys/bootstrap-ticket-lifecycle-store';
import {createPrismaBootstrapChannelStore} from '../modules/api-keys/bootstrap-channel-store';
import {createTicketRevocationReadProtocol,type TicketRevocationVerifier} from '../modules/api-keys/bootstrap-ticket-revocation-reader';
import {ticketContentDigest,ticketEnvelopeDigest} from '../modules/api-keys/bootstrap-ticket-v2-digests';
import {lifecycleFlags} from '../modules/api-keys/bootstrap-ticket-lifecycle-contract';
const enabled=process.env.WORKER_IDENTITY_NATIVE_DATABASE;
type Fixture=Awaited<ReturnType<typeof ticketFixture>>;
test('canonical ticket revocation native qualification',{skip:!enabled,timeout:850000},async t=>{
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
 async function issued(){const f=await ticketFixture(db);try{await f.store.register(f.registration);}catch{assert.fail('Issue fixture failed: '+JSON.stringify(f.errors));}return f;}
 function reader(f:Fixture,clock=()=>new Date()){
  let accept=true,expectedDb:Db|undefined;const modes:any[]=[],proofs:any[]=[],transactions=new Set<object>();
  const verifier:TicketRevocationVerifier={qualification:'synthetic_canonical_ticket_revocation_verifier_v1',verify:async(tx,p)=>{
   assert.equal(tx,expectedDb);assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.issuer));proofs.push(p);
   assert.equal(p.issuer.material.publicKeyDigest,f.b.ticketPublicKeyDigest);assert.equal(p.issuer.epoch,f.b.ticketKeyEpoch);
   assert.equal(p.issuerRevision,p.identity.issuerRevision);assert.equal(p.issuerHistoryDigest,p.identity.issuerHistoryDigest);
   return accept&&p.envelopeDigest===ticketEnvelopeDigest(p.signed)&&p.contentDigest===ticketContentDigest(p.signed.payload);
  }};
  const source=createCanonicalBootstrapAuthoritySource(clock,verifier);
  async function bound<T>(work:(selectedSource:typeof source,tx:Db)=>Promise<T>,mode:'read'|'write'='read',selected=source){return db.$transaction(async tx=>{
   if(mode==='read')await tx.$executeRaw`SET TRANSACTION READ ONLY`;
   const release=await selected.bindTransaction!(tx,mode);expectedDb=tx;transactions.add(tx);
   modes.push((await tx.$queryRaw<any[]>`SELECT current_setting('transaction_isolation') AS isolation,current_setting('transaction_read_only') AS readonly`)[0]);
   try{return await work(selected,tx);}finally{release();}
  },{isolationLevel:mode==='read'?'RepeatableRead':'Serializable',maxWait:20000,timeout:30000});}
  return {source,verifier,bound,modes,proofs,transactions,reject:()=>accept=false,read:(value:unknown={ticketId:f.ticket.id})=>bound((s,tx)=>s.inspectTicketRevocation(tx,value))};
 }
 async function phase(f:Fixture,until:'consumed'|'dispatched'|'completed'){
  await f.store.transition(await f.command('reserve'));await f.store.transition(await f.command('consume'));if(until==='consumed')return;
  const p=await f.inspect();assert.ok(p.ok);if(!p.ok)throw Error('missing attempt');
  const peer={payload:{binding:f.b,attemptId:p.head.attemptId,ticketDigest:f.identity.ticketDigest,certificateEpoch:f.snapshot.certificateEpoch,origin:f.snapshot.origin,serverName:f.snapshot.serverName,pin:f.snapshot.leafPin,caDigest:f.snapshot.caDigest,
   certificateNotBefore:f.snapshot.certificateNotBefore,certificateNotAfter:f.snapshot.certificateNotAfter,addresses:['8.8.8.8'],peerAddress:'8.8.8.8',resolverPolicy:'public_ipv4_only_v1',source:'issuer_signed_peer_observation_v1',chainValid:true,hostnameValid:true,observedAt:new Date().toISOString(),expiresAt:f.iso(60000),redirect:false,proxy:false,downgrade:false},signature:'0'.repeat(128)};
  try{await f.store.transition({...await f.command('dispatch'),evidence:{peer}});
   if(until==='completed')await f.store.transition({...await f.command('complete'),evidence:{completion:{payload:{version:'worker-bootstrap-completion-v1',attemptId:p.head.attemptId,ticketDigest:f.identity.ticketDigest,requestId:f.ticket.intent.requestId,state:'acknowledged',credential:f.ticket.intent.target,peer:peer.payload,responseDigest:hash('4'),committedAt:new Date().toISOString()},signature:'0'.repeat(128)}}});
  }catch{assert.fail('Phase failed: '+JSON.stringify(f.errors));}
 }
 const smoke=await issued();assert.equal((await reader(smoke).read()).state,'valid_not_revoked');
 await t.test('actual bound authority shares verifier transaction and READ ONLY or Serializable status performs no writes',async()=>{
  const f=await issued(),r=reader(f),before=await snapshot();let released:Db|undefined;
  for(const mode of ['read','write'] as const)await r.bound(async(s,tx)=>{released=tx;const p=await s.inspectTicketRevocation(tx,{ticketId:f.ticket.id});assert.ok(p.ok);assert.equal(await s.ticketRevoked(tx,f.ticket.id),false);},mode);
  await assert.rejects(r.source.inspectTicketRevocation(released!,{ticketId:f.ticket.id}),CanonicalBootstrapBlocked);assert.deepEqual(await snapshot(),before);
  assert.deepEqual(r.modes,[{isolation:'repeatable read',readonly:'on'},{isolation:'serializable',readonly:'off'}]);assert.equal(r.transactions.size,2);
 });
 await t.test('all native persisted states plus clock expiry and absent root remain distinct and fail closed',async()=>{
  for(const state of ['valid_not_revoked','consumed','completed','terminal_revoked','expired','terminal_unknown']){const f=await issued();
   if(state==='consumed'||state==='completed')await phase(f,state);if(state==='terminal_revoked')await f.store.transition(await f.command('revoke'));
   if(state==='terminal_unknown'){await phase(f,'dispatched');await f.store.transition(await f.command('unknown'));}
   const r=reader(f,state==='expired'?()=>new Date(f.iso(100000)):()=>new Date()),before=await snapshot(),p=await r.read();assert.ok(p.ok,state);assert.equal(p.state,state);assert.deepEqual(await snapshot(),before);
   if(p.ok){assert.equal(p.admissible,['valid_not_revoked','consumed'].includes(state));assert.equal(p.reconciliationRequired,state==='terminal_unknown');}
   assert.equal((await r.read({ticketId:randomUUID()})).state,'invalid_incomplete');
  }
 });
 await t.test('preconsume and consumed recovery preserve terminal predecessor and exact nullable attempt',async()=>{
  for(const consumed of [false,true]){const f=await issued();if(consumed)await phase(f,'consumed');
   await createPrismaBootstrapChannelStore(db).transition({ticketId:f.ticket.id,operationId:randomUUID(),expectedRevision:1,action:'revoke'});await f.store.transition(await f.command('revoke'));
   const p=await f.inspect();assert.ok(p.ok);if(!p.ok)throw Error('predecessor missing');const next=await ticketFixture(db,{base:f,identity:f.identity,head:p.head,digest:p.digest});
   try{await next.store.register(next.registration);}catch{assert.fail('Recovery failed: '+JSON.stringify(next.errors));}
   const a=await reader(f).read(),b=await reader(next).read();assert.equal(a.state,'terminal_revoked');assert.equal(b.state,'valid_not_revoked');assert.ok(a.ok&&b.ok);
   if(a.ok&&b.ok){assert.equal(b.identity.predecessor?.attemptId,p.head.attemptId);assert.equal(!!p.head.attemptId,consumed);}
  }
 });
 await t.test('twenty concurrent readers see deterministic committed snapshots around one fenced revocation',async()=>{
  const f=await issued(),initial=await reader(f).read();assert.ok(initial.ok);if(!initial.ok)return;
  const command=await f.command('revoke');let ready!:()=>void,release!:()=>void;const waiting=new Promise<void>(r=>ready=r),gate=new Promise<void>(r=>release=r);
  f.afterQuery(async(_tx,sql)=>{if(sql.startsWith('INSERT INTO worker_bootstrap_lifecycle_events')){ready();await gate;}});
  const revoke=f.store.transition(command);await waiting;
  try{const before=await Promise.all(Array.from({length:20},()=>reader(f).read()));for(const p of before){assert.equal(p.state,'valid_not_revoked');assert.ok(p.ok);if(p.ok){assert.equal(p.fence,initial.fence);assert.equal(p.revision,initial.revision);assert.equal(p.digest,initial.digest);}}}finally{release();await revoke;}
  const after=await Promise.all(Array.from({length:20},()=>reader(f).read()));assert.equal(new Set(after.map(p=>p.ok?p.fence:'invalid')).size,1);
  for(const p of after){assert.equal(p.state,'terminal_revoked');assert.ok(p.ok);if(p.ok){assert.equal(p.revision,initial.revision+1);assert.ok(BigInt(p.fence)>BigInt(initial.fence));assert.notEqual(p.digest,initial.digest);}}
 });
 await t.test('paired fresh native projections gate send completion and uncertain outcomes without retry',async()=>{
  for(const fault of ['none','before2','before4','after_send','reply_loss','complete_loss']){const f=await issued();await phase(f,'dispatched');const r=reader(f);let reads=0,sends=0,completes=0;
   const protocol=createTicketRevocationReadProtocol({qualification:'synthetic_ticket_revocation_reader_protocol_v1',read:async value=>{reads++;if(fault===`before${reads}`)await f.store.transition(await f.command('revoke'));return r.read(value);},
    exchange:async()=>{sends++;if(fault==='after_send')await f.store.transition(await f.command('revoke'));if(fault==='reply_loss')throw new TicketLifecycleUnknown();return 'public synthetic reply';},complete:async()=>{completes++;if(fault==='complete_loss')throw new TicketLifecycleUnknown();}});
   const result=await protocol.run({ticketId:f.ticket.id});assert.equal(result.ok,fault==='none');assert.equal(sends,fault==='before2'?0:1);assert.equal(completes,['none','complete_loss'].includes(fault)?1:0);assert.equal(r.transactions.size,reads);
   if(!result.ok){assert.equal(result.retryable,false);assert.equal(result.reconciliationRequired,sends>0);assert.equal(result.error,sends?'delivery_unknown':'denied');}
  }
 });
 await t.test('missing canonical root history head audit receipt lifecycle issuer and channel evidence never means unrevoked',async()=>{
  for(const table of ['worker_bootstrap_tickets','worker_bootstrap_lifecycle_events','worker_bootstrap_attempts','worker_bootstrap_history','worker_bootstrap_heads','worker_bootstrap_audit','worker_bootstrap_write_receipts','worker_identity_lifecycle_audit','bootstrap_issuer_audit','worker_transport_heads','worker_transport_bootstrap_grants']){
   const f=await issued();await phase(f,'consumed');
   const where=table==='worker_bootstrap_tickets'?`id='${f.ticket.id}'`:table==='worker_bootstrap_history'?`attempt_id IN (SELECT id FROM worker_bootstrap_attempts WHERE ticket_id='${f.ticket.id}')`:table==='worker_identity_lifecycle_audit'?`operation_id IN (SELECT id FROM worker_identity_lifecycle WHERE workspace_id='${f.b.workspaceId}')`:table==='bootstrap_issuer_audit'?`operation_id IN (SELECT id FROM bootstrap_issuer_history WHERE workspace_id='${f.b.workspaceId}')`:['worker_bootstrap_heads','worker_transport_heads'].includes(table)?`workspace_id='${f.b.workspaceId}'`:`ticket_id='${f.ticket.id}'`;
   await prepare(db,tx=>tx.$executeRawUnsafe(`DELETE FROM ${table} WHERE ${where}`));const before=await snapshot(),r=reader(f);assert.equal((await r.read()).state,'invalid_incomplete',table);
   await assert.rejects(r.bound((s,tx)=>s.ticketRevoked(tx,f.ticket.id)),CanonicalBootstrapBlocked);assert.deepEqual(await snapshot(),before);
  }
 });
 await t.test('stale owner generation lifecycle issuer epoch channel and source fence deny',async()=>{
  for(const kind of ['owner','generation','lifecycle','issuer','channel','fence']){const f=await issued();
   await prepare(db,async tx=>{if(kind==='owner')await tx.$executeRaw`UPDATE workspace_memberships SET role='member' WHERE workspace_id=${f.b.workspaceId}::uuid`;
    if(kind==='generation')await tx.$executeRaw`UPDATE worker_bootstrap_tickets SET lifecycle_identity=jsonb_set(lifecycle_identity,'{generation}','2'::jsonb) WHERE id=${f.ticket.id}::uuid`;
    if(kind==='lifecycle')await tx.$executeRaw`UPDATE worker_identity_lifecycle SET generation=${randomUUID()}::uuid WHERE workspace_id=${f.b.workspaceId}::uuid AND kind='host'`;
    if(kind==='issuer')await tx.$executeRaw`UPDATE trusted_provider_ticket_keys SET epoch=2 WHERE workspace_id=${f.b.workspaceId}::uuid`;
    if(kind==='channel')await tx.$executeRaw`UPDATE worker_transport_bootstrap_grants SET record=jsonb_set(record,'{intent,snapshot,caDigest}',${JSON.stringify(hash('0'))}::jsonb) WHERE ticket_id=${f.ticket.id}::uuid`;
    if(kind==='fence')await tx.$executeRaw`UPDATE ready_source_fence SET revision=revision+1 WHERE id=1`;
   });const before=await snapshot();assert.equal((await reader(f).read()).state,'invalid_incomplete',kind);assert.deepEqual(await snapshot(),before);
  }
 });
 await t.test('missing rejected verifier and caller overrides deny without crypto or state changes',async()=>{
  const f=await issued(),r=reader(f),before=await snapshot(),absent=createCanonicalBootstrapAuthoritySource();
  assert.equal((await r.bound((s,tx)=>s.inspectTicketRevocation(tx,{ticketId:f.ticket.id}),'read',absent)).ok,false);r.reject();assert.equal((await r.read()).ok,false);
  for(const key of ['identity','revoked','force','fence','verifier'])assert.equal((await reader(f).read({ticketId:f.ticket.id,[key]:true})).ok,false);assert.deepEqual(await snapshot(),before);
 });
 await t.test('minimal native guard helper and replica tampering is detected with successful restoration',async()=>{
  const f=await issued(),r=reader(f);await db.$executeRawUnsafe('ALTER TABLE worker_bootstrap_tickets DISABLE TRIGGER bootstrap_lifecycle_write_guard');try{assert.equal((await r.read()).ok,false);}finally{await db.$executeRawUnsafe('ALTER TABLE worker_bootstrap_tickets ENABLE TRIGGER bootstrap_lifecycle_write_guard');}
  const original=(await db.$queryRaw<any[]>`SELECT pg_get_functiondef(oid) AS body FROM pg_proc WHERE proname='bootstrap_lifecycle_channel_bound'`)[0].body;
  await db.$executeRawUnsafe('ALTER FUNCTION bootstrap_lifecycle_channel_bound(jsonb) SET search_path=pg_catalog');try{assert.equal((await r.read()).ok,false);}finally{await db.$executeRawUnsafe(original);}
  await r.bound(async(s,tx)=>{await tx.$executeRaw`SET LOCAL session_replication_role=replica`;assert.equal((await s.inspectTicketRevocation(tx,{ticketId:f.ticket.id})).ok,false);});assert.ok((await r.read()).ok);
 });
 await t.test('fence changed inside bound Serializable verifier invalidates proof and transaction rollback restores data',async()=>{
  const f=await issued(),r=reader(f),before=await snapshot(),s=createCanonicalBootstrapAuthoritySource(()=>new Date(),{...r.verifier,verify:async tx=>{await tx.$executeRaw`UPDATE ready_source_fence SET revision=revision+1 WHERE id=1`;return true;}});
  await assert.rejects(r.bound((source,tx)=>source.inspectTicketRevocation(tx,{ticketId:f.ticket.id}),'write',s),CanonicalBootstrapBlocked);assert.deepEqual(await snapshot(),before);
 });
 await t.test('lost revoke COMMIT acknowledgement and separate issue readback failure require reconciliation once',async()=>{
  const f=await issued(),command=await f.command('revoke'),writes=f.attempts.writes;f.before(tx=>tx.$queryRawUnsafe("SELECT 'native_drop_commit_response'").then(()=>{}));await assert.rejects(f.store.transition(command),unknown);
  assert.equal(f.attempts.writes,writes+1);assert.equal((await reader(f).read()).state,'terminal_revoked');assert.equal((await db.$queryRaw<any[]>`SELECT count(*)::int AS n FROM worker_bootstrap_lifecycle_events WHERE ticket_id=${f.ticket.id}::uuid`)[0].n,2);
  const g=await ticketFixture(db);g.fault('readback');await assert.rejects(g.store.register(g.registration),unknown);g.fault('');assert.equal((await reader(g).read()).state,'valid_not_revoked');assert.equal(g.attempts.writes,1);
 });
 await t.test('conditional native reader leaves signed decision and production authority blocked with all flags false',async()=>{
  const f=await issued(),r=reader(f);await r.bound(async(s,tx)=>{const p=await s.inspect(tx,{binding:f.b,decisionId:f.ticket.decisionId,purpose:'first_enrollment',ticketId:f.ticket.id});
   assert.ok(!p.blockers.includes('bootstrap_ticket_revocation_unavailable'));assert.ok(p.blockers.includes('signed_current_decision_unavailable'));assert.equal(p.ok,false);for(const key of Object.keys(lifecycleFlags))assert.equal((p as any)[key],false);
   await assert.rejects(s.context(tx,f.b,f.ticket.issuedAt,f.ticket.id),(e:any)=>e instanceof CanonicalBootstrapBlocked&&e.blockers.length===1&&e.blockers[0]==='signed_current_decision_unavailable');
  });assert.equal(effects,0);assert.deepEqual(logs,[]);
 });
});
