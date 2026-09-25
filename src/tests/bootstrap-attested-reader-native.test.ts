import test from 'node:test';
import assert from 'node:assert/strict';
import crypto,{randomUUID} from 'node:crypto';
import net from 'node:net';import tls from 'node:tls';import http from 'node:http';import https from 'node:https';import dns from 'node:dns';import childProcess from 'node:child_process';
import {PrismaClient} from '@prisma/client';
import {attestationNativeFixture,owned,prepare,NativeRegistrationDenied,type Db} from './decision-attestation-native-fixture';
import {ticketFixture} from './bootstrap-ticket-native-fixture';
import {createPrismaBootstrapChannelStore} from '../modules/api-keys/bootstrap-channel-store';
import {createPrismaDecisionAttestationPorts} from '../modules/api-keys/decision-attestation-prisma-ports';
import {createDecisionAuthorityReader,decisionReaderEvidence,type DecisionReaderTrust} from '../modules/api-keys/bootstrap-decision-authority-reader';
import {createCanonicalBootstrapAuthoritySource} from '../modules/api-keys/worker-bootstrap-authority-source';
import {createAttestedBootstrapComposition} from '../modules/api-keys/bootstrap-attested-composition';
import {reviewDigest} from '../modules/agent-runtime/task-review-contract';
import {lifecycleFlags} from '../modules/api-keys/bootstrap-ticket-lifecycle-contract';

test('native canonical attested decision reader/composition',{skip:!process.env.WORKER_IDENTITY_NATIVE_DATABASE,timeout:850000},async t=>{
 const db=new PrismaClient(),peer=new PrismaClient();await db.$connect();await peer.$connect();await owned(db);await owned(peer);
 t.after(async()=>{await peer.$disconnect();await db.$disconnect();});
 let effects=0,registrationBlocked=false;const forbid=()=>{effects++;throw Error('non-database effect forbidden');};
 for(const m of ['connect','createConnection'] as const)t.mock.method(net,m,forbid);t.mock.method(net.Server.prototype,'listen',forbid);t.mock.method(tls,'connect',forbid);
 for(const mod of [http,https])for(const m of ['request','get'] as const)t.mock.method(mod,m,forbid);
 for(const m of ['lookup','resolve','resolve4','resolve6'] as const){t.mock.method(dns,m,forbid);t.mock.method(dns.promises,m,forbid);}
 t.mock.method(globalThis,'fetch',forbid);for(const m of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'] as const)t.mock.method(childProcess,m,forbid);
 for(const m of ['generateKeyPair','generateKeyPairSync','createPrivateKey','sign'] as const)t.mock.method(crypto,m,forbid);
 const tables=['workspaces','workspace_memberships','agent_hosts','trusted_provider_ticket_keys','worker_identity_lifecycle','worker_identity_lifecycle_audit',
  'bootstrap_issuer_history','bootstrap_issuer_audit','decisions','decision_revisions','decision_acceptances','decision_impact_previews',
  'decision_attestation_key_history','decision_owner_auth_evidence','decision_attestations','decision_authority_events','decision_attestation_write_receipts',
  'worker_transport_bootstrap_grants','worker_transport_history','worker_transport_heads','worker_transport_audit','worker_transport_write_audit',
  'worker_bootstrap_tickets','worker_bootstrap_attempts','worker_bootstrap_history','worker_bootstrap_heads','worker_bootstrap_audit',
  'worker_bootstrap_lifecycle_events','worker_bootstrap_write_receipts','ready_source_fence','events'];
 async function snapshot(){return db.$queryRawUnsafe(tables.map(table=>`SELECT '${table}' AS tbl,count(*)::int AS count,md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY to_jsonb(t)::text),'')) AS digest FROM ${table} t`).join(' UNION ALL ')+' ORDER BY tbl');}
 type Fixture=Awaited<ReturnType<typeof attestationNativeFixture>>;
 async function fresh(options:Parameters<typeof attestationNativeFixture>[1]={},sealed=true){
  assert.equal(registrationBlocked,false,'Registration risk reopened; no further fixture registration');let f:Fixture;
  try{f=await attestationNativeFixture(db,options);}catch(e){if(e instanceof NativeRegistrationDenied){registrationBlocked=true;
    console.error(JSON.stringify({alert:'unexpected_registration_denial',reopen:true,retryable:false,requiresClassification:true}));}throw e;}
  await f.ready();assert.equal((await f.ports.execute(await f.command('attest'))).ok,true,JSON.stringify(f.errors));
  if(sealed)assert.equal((await f.ports.execute(await f.command('seal'))).ok,true,JSON.stringify(f.errors));return f;
 }
 function harness(f:Fixture){
  const scope={...f.q,binding:f.reg.identity.binding,purpose:f.reg.identity.purpose};
  const active=new WeakMap<object,{calls:string[];pid:number}>(),traces:{db:Db;pid:number;client:number;at:string;mode:string;isolation:string;calls:string[]}[]=[];
  const controls={signature:true,ticket:true,auth:true,key:true};let reads=0,exchanges=0,completions=0;
  const hooks:{read?:(n:number)=>Promise<void>;exchange?:()=>Promise<void>;complete?:()=>Promise<void>;afterSnapshot?:(tx:Db,n:number)=>Promise<void>}={};
  const check=(tx:Db,kind:string)=>{const a=active.get(tx);assert.ok(a,'trust seam must receive the same bound Db');a.calls.push('trust:'+kind);};
  const readPorts=createPrismaDecisionAttestationPorts({transaction:async()=>{throw Error('Nested read transaction forbidden');},
   verifier:{verify:async(tx,e)=>{check(tx,'signature');assert.ok(Object.isFrozen(e));return controls.signature&&await f.deps.verifier!.verify(tx,e);}},
   ticketVerifier:{verify:async(tx,r)=>{check(tx,'ticket');return controls.ticket&&await f.deps.ticketVerifier!.verify(tx,r);}}});
  const trust:DecisionReaderTrust={qualification:'synthetic_decision_reader_trust_v1',verifyOwnerAuthentication:async(tx,e)=>{check(tx,'auth');
   return controls.auth&&reviewDigest(e.auth)===reviewDigest(f.auth)&&e.ceremony.ownerId===f.auth.ownerId;},
   trustPublicKey:async(tx,e)=>{check(tx,'key');return controls.key&&reviewDigest(e.key.material)===reviewDigest(f.material)&&e.highWater===f.material.epoch;}};
  const config={qualification:'native_qualified_decision_read_ports_v1',evidence:decisionReaderEvidence,ports:readPorts,trust};
  const reader=createDecisionAuthorityReader(config),source=createCanonicalBootstrapAuthoritySource(undefined,undefined,reader);
  async function readTransaction<T>(work:(tx:Db)=>Promise<T>){const n=++reads;await hooks.read?.(n);const client=n%2?db:peer;
   return client.$transaction(async tx=>{
    await tx.$executeRaw`SET LOCAL TIME ZONE 'UTC'`;await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const m=(await tx.$queryRaw<any[]>`SELECT pg_backend_pid() AS pid,transaction_timestamp()::text AS at,
     current_setting('transaction_read_only') AS mode,current_setting('transaction_isolation') AS isolation`)[0];
    assert.equal(m.mode,'on');assert.equal(m.isolation,'repeatable read');
    const calls:string[]=[],proxy=new Proxy(tx,{get(target,key){const value=Reflect.get(target,key);
     if(key==='$executeRaw'||key==='$executeRawUnsafe')return ()=>{throw Error('read mutation forbidden');};
     if(key==='$queryRaw')return async(...args:any[])=>{const sql=(Array.isArray(args[0])?args[0].join('?'):args[0].sql).replace(/\s+/g,' ').trim();
      assert.match(sql,/^(SELECT|WITH)\b/);assert.ok(!/FOR UPDATE|\b(INSERT INTO|UPDATE [a-z_]+ SET|DELETE FROM)\b/.test(sql));calls.push(sql);
      return (value as any).apply(target,args);};return typeof value==='function'?value.bind(target):value;}});
    traces.push({db:proxy,...m,client:n%2,calls});active.set(proxy,{pid:m.pid,calls});
    try{await hooks.afterSnapshot?.(tx,n);return await work(proxy);}finally{active.delete(proxy);}
   },{isolationLevel:'RepeatableRead',maxWait:60000,timeout:30000});
  }
  const deps={qualification:'synthetic_attested_composition_v1' as const,decisionAuthority:reader,readTransaction,
   exchange:async()=>{exchanges++;await hooks.exchange?.();return {syntheticReplyDigest:reviewDigest('public response')};},
   complete:async()=>{completions++;await hooks.complete?.();}};
  const composition=createAttestedBootstrapComposition(deps);
  async function input(){const a=await db.$queryRaw<any[]>`SELECT id FROM worker_bootstrap_attempts WHERE ticket_id=${f.q.ticketId}::uuid`;
   return {...scope,attemptId:a[0]?.id??randomUUID()};}
  return {f,scope,reader,readPorts,trust,config,source,controls,hooks,traces,deps,composition,input,counts:()=>({reads,exchanges,completions}),
   inspectSource:()=>readTransaction(async tx=>{const release=await source.bindTransaction!(tx,'read');try{return await source.inspect(tx,scope);}finally{release();}})};
 }
 async function denied(h:ReturnType<typeof harness>){const before=await snapshot(),result=await h.composition.run(await h.input());
  assert.equal(result.ok,false);assert.equal(h.counts().exchanges,0);assert.deepEqual(await snapshot(),before);return result;}
 async function sourceWrite(f:Fixture){await db.$executeRaw`UPDATE workspaces SET name=name WHERE id=${f.b.workspaceId}::uuid`;}
 const unknown=(r:any)=>{assert.equal(r.ok,false);assert.equal(r.error,'delivery_unknown');assert.equal(r.reconciliationRequired,true);assert.equal(r.retryable,false);};

 await t.test('complete first enrollment binds native owner lifecycle issuer channel ticket decision seal receipt and four pure snapshots',async()=>{
  const f=await fresh(),h=harness(f),before=await snapshot();const status=await h.inspectSource();assert.equal(status.ok,true,JSON.stringify(status));
  const start=h.traces.length,result=await h.composition.run(await h.input());assert.equal(result.ok,true,JSON.stringify(result));assert.equal(h.counts().exchanges,1);
  const reads=h.traces.slice(start);assert.equal(reads.length,4);assert.equal(new Set(reads.map(r=>r.db)).size,4);
  assert.notEqual(reads[0].pid,reads[1].pid);assert.notEqual(reads[2].pid,reads[3].pid);assert.equal(new Set(reads.map(r=>r.at)).size,4);
  for(const r of reads)for(const marker of ['FROM objects o','bootstrap_lifecycle_current','FROM worker_identity_lifecycle l','FROM bootstrap_issuer_history h','operationCount',
   'trust:signature','trust:ticket','trust:auth','trust:key'])assert.ok(r.calls.some(c=>c.includes(marker)),marker);
  assert.deepEqual(await snapshot(),before);for(const key of Object.keys(lifecycleFlags))assert.equal((result as any)[key],false);
  console.log(JSON.stringify({nativeReaderFirst:true,freshDbObjects:4,distinctClientPairs:true,readOnly:true,purityTables:tables.length,privateKeys:0,realExchange:0}));
 });
 await t.test('complete owner recovery retains exact terminal predecessor and native seal',async()=>{
  const prior=await ticketFixture(db);await prior.store.register(prior.registration);
  await createPrismaBootstrapChannelStore(db).transition({ticketId:prior.ticket.id,operationId:randomUUID(),expectedRevision:1,action:'revoke'});
  await prior.store.transition(await prior.command('revoke'));const p=await prior.inspect();assert.ok(p.ok);if(!p.ok)return;
  const f=await fresh({prior:{base:prior,identity:prior.identity,head:p.head,digest:p.digest}}),h=harness(f),before=await snapshot();
  const status=await h.composition.inspect(h.scope);assert.ok(status.ok);if(!status.ok)return;
  assert.equal(status.identity.purpose,'owner_recovery');assert.equal(status.identity.predecessor?.ticketId,prior.identity.ticketId);
  assert.equal(status.identity.predecessor?.attemptId,null);assert.equal((await h.composition.run(await h.input())).ok,true);assert.deepEqual(await snapshot(),before);
 });
 await t.test('absent copied wrong capability evidence version and trust dependencies remain unavailable',async()=>{
  const h=harness(await fresh());for(const change of [{ports:undefined},{ports:{...h.readPorts}},{qualification:'production'},
   {evidence:{...decisionReaderEvidence,portsVersion:'v2'}},{evidence:{...decisionReaderEvidence,migration83LfSha256:'0'.repeat(64)}},{trust:undefined},
   {trust:{...h.trust,qualification:'production'}},{trust:{...h.trust,trustPublicKey:undefined}}])assert.throws(()=>createDecisionAuthorityReader({...h.config,...change} as any));
  for(const dep of [undefined,{}, {...h.reader}])assert.equal((await createAttestedBootstrapComposition({...h.deps,decisionAuthority:dep}).run(await h.input())).ok,false);
  const defaultSource=createCanonicalBootstrapAuthoritySource();await h.deps.readTransaction(async tx=>{const release=await defaultSource.bindTransaction!(tx,'read');
   try{await assert.rejects(defaultSource.decision(tx,h.scope.decisionId),(e:any)=>e.blockers.includes('signed_current_decision_unavailable'));}finally{release();}});
  assert.equal(h.counts().exchanges,0);
 });
 await t.test('invalid signature auth key ticket and absent concrete verifiers deny on the actual bound Db',async()=>{
  const h=harness(await fresh());for(const key of ['signature','auth','key','ticket'] as const){h.controls[key]=false;await denied(h);h.controls[key]=true;}
  for(const key of ['verifier','ticketVerifier']){const deps={...h.f.deps,[key]:undefined,signer:undefined};
   const reader=createDecisionAuthorityReader({...h.config,ports:createPrismaDecisionAttestationPorts(deps)});
   assert.equal((await createAttestedBootstrapComposition({...h.deps,decisionAuthority:reader}).run(await h.input())).ok,false);}
  assert.equal(h.counts().exchanges,0);
 });
 await t.test('native owner revision policy lifecycle issuer channel and signed binding drift deny without repair',async()=>{
  for(const cause of ['owner','revision','policy','lifecycle','issuer','channel','binding','unsigned']){const f=await fresh(),h=harness(f);
   await prepare(db,async tx=>{
    if(cause==='owner')await tx.$executeRaw`UPDATE workspace_memberships SET role='member' WHERE workspace_id=${f.b.workspaceId}::uuid AND user_id=${f.auth.ownerId}::uuid`;
    if(cause==='revision')await tx.$executeRaw`UPDATE decision_revisions SET version=version+1 WHERE decision_id=${f.q.decisionId}::uuid`;
    if(cause==='policy')await tx.$executeRaw`UPDATE decision_revisions SET body=jsonb_set(body,'{ownerDecisionAttestation,revision}','2'::jsonb) WHERE decision_id=${f.q.decisionId}::uuid`;
    if(cause==='lifecycle')await tx.$executeRaw`UPDATE worker_identity_lifecycle SET generation=${randomUUID()}::uuid WHERE workspace_id=${f.b.workspaceId}::uuid AND kind='host'`;
    if(cause==='issuer')await tx.$executeRaw`UPDATE trusted_provider_ticket_keys SET epoch=epoch+1 WHERE workspace_id=${f.b.workspaceId}::uuid`;
    if(cause==='channel')await tx.$executeRaw`UPDATE worker_transport_bootstrap_grants SET record_digest=${'f'.repeat(64)} WHERE ticket_id=${f.q.ticketId}::uuid`;
    if(cause==='binding')await tx.$executeRaw`UPDATE decision_attestations SET record=jsonb_set(record,'{payload,binding,hostEpoch}','2'::jsonb) WHERE decision_id=${f.q.decisionId}::uuid`;
    if(cause==='unsigned')await tx.$executeRaw`UPDATE decision_attestations SET record=record-'signature' WHERE decision_id=${f.q.decisionId}::uuid`;
   });await denied(h);
  }
 });
 await t.test('native key revocation and terminal decision writers permanently invalidate source authority',async()=>{
  for(const action of ['key','revoke','supersede','reject']){const f=await fresh(),h=harness(f);
   const r=action==='key'?await f.key('revoke'):await f.ports.execute(await f.command('terminal',{action}));assert.equal(r.ok,true,JSON.stringify(f.errors));
   await denied(h);assert.equal((await h.composition.inspect(h.scope)).ok,false);}
 });
 await t.test('database clock expiry and certificate cutover deny without opportunistic expiry writes',async()=>{
  for(const cause of ['expiry','cutover']){const f=await fresh(cause==='expiry'?{policyTtlMs:12000}:{channelCutoverMs:12000}),h=harness(f);
   assert.equal((await h.composition.inspect(h.scope)).ok,true);const until=cause==='expiry'?f.policy.expiresAt:f.intent.snapshot.cutoverAt!;
   await new Promise(r=>setTimeout(r,Math.max(0,Date.parse(until)-Date.now()+30)));await denied(h);}
 });
 await t.test('missing mismatch and terminal seals or receipt gaps deny; no fresh attempt is synthesized',async()=>{
  const unsealed=harness(await fresh({},false));assert.equal((await unsealed.composition.inspect(unsealed.scope)).ok,true);await denied(unsealed);
  for(const cause of ['missingSeal','mismatchSeal','receipt','receiptMutation','terminal']){const f=await fresh(),h=harness(f);
   await prepare(db,async tx=>{
    if(cause==='missingSeal')await tx.$executeRaw`UPDATE worker_bootstrap_attempts SET attestation_id=NULL,attestation_seal=NULL,attestation_committed_at=NULL,attestation_mutation_digest=NULL WHERE ticket_id=${f.q.ticketId}::uuid`;
    if(cause==='mismatchSeal')await tx.$executeRaw`UPDATE worker_bootstrap_attempts SET attestation_seal=jsonb_set(attestation_seal,'{attestationDigest}',${JSON.stringify('0'.repeat(64))}::jsonb) WHERE ticket_id=${f.q.ticketId}::uuid`;
    if(cause==='receipt')await tx.$executeRaw`DELETE FROM decision_attestation_write_receipts WHERE workspace_id=${f.b.workspaceId}::uuid AND table_name='worker_bootstrap_attempts'`;
    if(cause==='receiptMutation')await tx.$executeRaw`UPDATE worker_bootstrap_attempts SET attestation_mutation_digest=${'f'.repeat(64)} WHERE ticket_id=${f.q.ticketId}::uuid`;
    if(cause==='terminal')await tx.$executeRaw`UPDATE worker_bootstrap_heads SET state='delivery_unknown' WHERE workspace_id=${f.b.workspaceId}::uuid AND host_id=${f.b.hostId}::uuid`;
   });await denied(h);}
 });
 await t.test('wrong mode unbound reused Db and fabricated transaction responses fail closed',async()=>{
  const h=harness(await fresh());await assert.rejects(h.source.inspectDecisionAuthority({} as any,h.scope));
  await db.$transaction(async tx=>{await assert.rejects(h.source.bindTransaction!(tx,'read'));},{isolationLevel:'Serializable'});
  for(const kind of ['sameDb','repeat','fabricated']){let cached:Db|undefined;
   const readTransaction=async<T>(work:(tx:Db)=>Promise<T>)=>h.deps.readTransaction(async tx=>{const r=await work(kind==='sameDb'?(cached??=tx):tx);
    if(kind==='repeat')await work(tx);return kind==='fabricated'?structuredClone(r):r;});
   assert.equal((await createAttestedBootstrapComposition({...h.deps,readTransaction}).run(await h.input())).ok,false);}
  assert.equal(h.counts().exchanges,0);
 });
 await t.test('committed drift between pre-send projections denies with zero exchange',async()=>{
  for(const action of ['source','revoke']){const f=await fresh(),h=harness(f);h.hooks.read=async n=>{if(n===2){
   if(action==='source')await sourceWrite(f);else assert.equal((await f.ports.execute(await f.command('terminal',{action:'revoke'}))).ok,true);}};
   const r=await h.composition.run(await h.input());assert.equal(r.ok,false);assert.equal('error'in r&&r.error,'denied');assert.equal(h.counts().exchanges,0);}
 });
 await t.test('possible exchange commit drift and lost completion/readback are delivery_unknown without retry',async()=>{
  for(const cause of ['source','revoke','exchangeLoss','readback','completion']){const f=await fresh(),h=harness(f);const input=await h.input();
   h.hooks.exchange=async()=>{if(cause==='source')await sourceWrite(f);if(cause==='revoke')assert.equal((await f.ports.execute(await f.command('terminal',{action:'revoke'}))).ok,true);
    if(cause==='exchangeLoss')throw Error('synthetic possible response loss');};
   h.hooks.read=async n=>{if(cause==='readback'&&n===3)throw Error('synthetic readback unavailable');};
   h.hooks.complete=async()=>{if(cause==='completion')throw Error('synthetic completion acknowledgment loss');};
   unknown(await h.composition.run(input));assert.equal((await h.composition.run(input)).ok,false);assert.equal(h.counts().exchanges,1);
   assert.equal(h.counts().completions,cause==='completion'?1:0);}
 });
 await t.test('twenty concurrent source factories exchange once in this process only',async()=>{
  const h=harness(await fresh()),input=await h.input(),before=await snapshot();
  const results=await Promise.all(Array.from({length:20},()=>createAttestedBootstrapComposition(h.deps).run(input)));
  assert.equal(results.filter(r=>r.ok).length,1,JSON.stringify(results));assert.equal(h.counts().exchanges,1);assert.equal(h.counts().completions,1);
  assert.deepEqual(await snapshot(),before);console.log(JSON.stringify({concurrentFactories:20,exchanges:1,processLocalOnly:true,durableMultiProcessQualified:false}));
 });
 await t.test('twenty native reads before and after held revoke/source-revision commits preserve MVCC and deny stale send',async()=>{
  for(const action of ['revoke','revision']){const f=await fresh(),h=harness(f);let entered!:()=>void,release!:()=>void;
   const waiting=new Promise<void>(r=>entered=r),gate=new Promise<void>(r=>release=r);
   const command=action==='revoke'?await f.command('terminal',{action}):null;
   if(action==='revoke')f.afterQuery(async(_tx,sql)=>{if(sql.startsWith('INSERT INTO decision_authority_events')){entered();await gate;}});
   const writer=action==='revoke'?f.ports.execute(command):peer.$transaction(async tx=>{await tx.$executeRaw`UPDATE workspaces SET name=name WHERE id=${f.b.workspaceId}::uuid`;entered();await gate;},{isolationLevel:'Serializable',timeout:30000});
   await waiting;
   try{const reads=await Promise.all(Array.from({length:20},()=>h.composition.inspect(h.scope)));assert.ok(reads.every(r=>r.ok));
    assert.equal(new Set(reads.map(r=>r.ok?r.projectionDigest:'denied')).size,1);
   }finally{release();const r=await writer;if(action==='revoke')assert.equal((r as any).ok,true);f.afterQuery();}
   const after=await Promise.all(Array.from({length:20},()=>h.composition.inspect(h.scope)));assert.ok(after.every(r=>!r.ok));await denied(h);
  }
 });
 await t.test('fresh second client observes authority changed after a held first snapshot',async()=>{
  const f=await fresh(),h=harness(f);h.hooks.afterSnapshot=async(_tx,n)=>{if(n===1)await sourceWrite(f);};
  const r=await h.composition.run(await h.input());assert.equal(r.ok,false);assert.equal(h.counts().exchanges,0);
  assert.equal(h.traces.length,2);assert.notEqual(h.traces[0].pid,h.traces[1].pid);
 });
 await t.test('false seal acknowledgement and missing mismatched unavailable readback never imply committed authority',async()=>{
  for(const cause of ['false','missing','mismatch','readback']){const f=await fresh({},false),c=await f.command('seal'),writes=f.counts.writes;f.fault(cause);
   const r=await f.ports.execute(c);assert.equal(r.ok,false);assert.equal('error'in r&&r.error,'reconciliation_required');assert.equal('retryable'in r&&r.retryable,false);
   assert.equal(f.counts.writes,writes+1);const count=(await db.$queryRaw<any[]>`SELECT count(*)::int AS n FROM worker_bootstrap_attempts WHERE ticket_id=${f.q.ticketId}::uuid`)[0].n;
   assert.equal(count,cause==='false'?0:1);f.fault('');const h=harness(f);if(cause==='false')await denied(h);else assert.equal((await h.composition.inspect(h.scope)).ok,true);
   // This is reconciliation evidence only; no exchange is attempted after the uncertain command.
   assert.equal(h.counts().exchanges,0);}
 });
 await t.test('one real post-COMMIT wire loss leaves one seal and requires read-only reconciliation with no command retry',async()=>{
  const f=await fresh({},false),command=await f.command('seal'),writes=f.counts.writes;
  f.before(tx=>tx.$queryRawUnsafe("SELECT 'native_drop_commit_response'").then(()=>{}));const r=await f.ports.execute(command);
  assert.equal(r.ok,false);assert.equal('error'in r&&r.error,'reconciliation_required');assert.equal(f.counts.writes,writes+1);
  assert.equal((await db.$queryRaw<any[]>`SELECT count(*)::int AS n FROM worker_bootstrap_attempts WHERE ticket_id=${f.q.ticketId}::uuid`)[0].n,1);
  const h=harness(f),before=await snapshot();assert.equal((await h.composition.inspect(h.scope)).ok,true);assert.deepEqual(await snapshot(),before);assert.equal(h.counts().exchanges,0);
 });
 await t.test('override denial read purity false readiness and no external effects preserve default production block',async()=>{
  const h=harness(await fresh()),before=await snapshot(),input=await h.input();
  for(const extra of [{force:true},{endpoint:'https://other.example'},{seal:{}},{authorityRevision:1},{profile:{}},{signature:'0'.repeat(128)}]){
   assert.equal((await h.composition.run({...input,...extra})).ok,false);assert.equal((await h.composition.inspect({...h.scope,...extra})).ok,false);}
  const p=await h.composition.inspect(h.scope);assert.ok(p.ok);for(const key of Object.keys(lifecycleFlags))assert.equal((p as any)[key],false);
  assert.deepEqual(await snapshot(),before);assert.equal(h.counts().exchanges,0);assert.equal(effects,0);assert.equal(registrationBlocked,false);
  console.log(JSON.stringify({nativeReaderQualification:true,productionQualified:false,durableDispatchQualified:false,defaultComposition:false,externalEffects:effects,...lifecycleFlags}));
 });
});
