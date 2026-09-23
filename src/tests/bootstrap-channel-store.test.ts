import test from 'node:test';import assert from 'node:assert/strict';import crypto,{randomUUID,createHash} from 'node:crypto';import {readFileSync} from 'node:fs';
import net from 'node:net';import tls from 'node:tls';import http from 'node:http';import https from 'node:https';import dns from 'node:dns';import childProcess from 'node:child_process';
import {bootstrapChannelFixture} from './bootstrap-channel-fixture';
import {createPrismaBootstrapChannelStore,ChannelReconciliationRequired} from '../modules/api-keys/bootstrap-channel-store';
import {channelGrantIntent,channelSnapshotDigest,channelEqual} from '../modules/api-keys/bootstrap-channel-persistence-contract';
import {channelGuards,channelShapeHash} from '../modules/api-keys/bootstrap-channel-guards';
import {issuerGuards} from '../modules/api-keys/bootstrap-issuer-guards';
import {advanceIssuer} from '../modules/api-keys/bootstrap-issuer-contract';
import {advanceLifecycle} from '../modules/api-keys/worker-identity-lifecycle';
import {createCanonicalBootstrapAuthoritySource,CanonicalBootstrapBlocked} from '../modules/api-keys/worker-bootstrap-authority-source';
import {reviewDigest} from '../modules/agent-runtime/task-review-contract';
import {decisionAuthority} from '../modules/decisions/decision-authority';
const copy=<T>(v:T):T=>structuredClone(v),hash=(s:string)=>s.repeat(64);
function fixture(purpose:'first_enrollment'|'owner_recovery'='first_enrollment'){
  const f=bootstrapChannelFixture(purpose),b=f.snapshot.binding,ownerId=f.ticket.ownerId;
  const der=Buffer.from('302a300506032b6570032100d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a','hex');
  b.ticketPublicKeyDigest=createHash('sha256').update(der).digest('hex');f.ticket.decisionIntentDigest=reviewDigest(f.intent);
  const material={keyId:b.ticketKeyId,algorithm:'Ed25519' as const,format:'spki-der-base64' as const,spki:der.toString('base64'),publicKeyDigest:b.ticketPublicKeyDigest};
  const key={workspaceId:b.workspaceId,installationId:b.installationId,keyId:b.ticketKeyId,epoch:1,publicKeyDigest:b.ticketPublicKeyDigest};
  const ii={schemaVersion:'bootstrap-issuer-v1' as const,binding:{workspaceId:b.workspaceId,issuerId:b.workspaceId,installationId:b.installationId,purpose:'worker-bootstrap-owner-ticket-v1' as const},
    action:'adopt' as const,expectedRevision:0,targetEpoch:1,material,activatesAt:null,cutoverAt:null,adoptionEvidenceDigest:hash('a'),expiresAt:f.iso(60000)};
  const issuer=advanceIssuer(ii,[],{ownerId,decisionId:randomUUID(),decisionRevision:1,intent:ii,current:true,fresh:false,head:key},randomUUID(),new Date(f.iso(-10000)));
  const lifecycle:any[]=[];
  for(const kind of ['installation','host'] as const){const i={schemaVersion:'worker-identity-lifecycle-v1' as const,workspaceId:b.workspaceId,kind,subjectId:kind==='host'?b.hostId:b.installationId,
    action:'adopt' as const,expected:null,generation:kind==='host'?f.snapshot.hostGeneration:f.snapshot.installationGeneration,installationId:b.installationId,
    installationGeneration:f.snapshot.installationGeneration,hostFingerprint:kind==='host'?b.hostFingerprint:null,authorityDigest:hash('a'),adoptionEvidenceDigest:hash('b'),expiresAt:f.iso(60000)};
    lifecycle.push(advanceLifecycle(i,[],{ownerId,decisionId:randomUUID(),decisionRevision:1,intent:i,current:true,anchorFresh:false,hostEnabled:true,writerFenced:true,installation:lifecycle[0]??null},randomUUID(),f.now()));}
  f.snapshot.issuerHistoryDigest=hash('9');f.snapshot.recordDigest=channelSnapshotDigest(f.snapshot);
  const intent:any={schemaVersion:'worker-bootstrap-channel-v1',ticketId:f.ticket.id,ticketDigest:hash('5'),expectedRevision:0,snapshot:f.snapshot};
  const decisionId=randomUUID(),acceptanceId=randomUUID(),guards:any[]=channelGuards.map(g=>({...g,enabled:true}));
  const state:any={generations:[],grants:[],history:[],head:null,audit:[],fence:20};let tail=Promise.resolve(),fault='',available=true,current=true,verified=true,shape={hash:channelShapeHash,enabled:true};
  let callbacks=0,appends=0;const calls:string[]=[],options:any[]=[];
  const client:any={$transaction:async(work:any,option:any)=>{let release!:()=>void;const wait=tail;tail=new Promise<void>(r=>release=r);await wait;
    const saved=copy(state);let readonly=false;if(option.isolationLevel==='Serializable')callbacks++;options.push(option);
    const db:any={$executeRaw:async(strings:TemplateStringsArray,...v:any[])=>{const sql=strings.join('?').replace(/\s+/g,' ').trim();calls.push(sql);
      if(sql==='SET TRANSACTION READ ONLY'){readonly=true;return 0;}assert.equal(readonly,false);assert.equal(option.isolationLevel,'Serializable');
      if(sql.startsWith('INSERT INTO worker_transport_generations')){state.generations.push({id:v[0],identity:JSON.parse(v[4]),purpose:v[6]});state.fence++;state.audit.push({kind:'generation',fence:state.fence});if(fault==='generation')throw Error('synthetic');return 1;}
      if(sql.startsWith('INSERT INTO worker_transport_bootstrap_grants')){assert.equal(state.grants.length,0);state.grants.push(JSON.parse(v[6]));state.fence++;state.audit.push({kind:'grant',fence:state.fence});if(fault==='grant')throw Error('synthetic');return 1;}
      assert.ok(sql.startsWith('WITH v AS'));appends++;const r=JSON.parse(v[0]),g=JSON.parse(v[1]);state.fence++;state.history.push(r);if(fault==='history')throw Error('synthetic');
      state.fence++;state.head={id:r.id,revision:r.revision,highWater:g.intent.snapshot.highWaterEpoch,purpose:g.intent.snapshot.purpose,state:r.state,generation:g.intent.snapshot.generation,pin:g.intent.snapshot.leafPin,record:copy(r),fence:''};if(fault==='head')throw Error('synthetic');
      state.fence++;state.head.fence=String(state.fence);state.audit.push({kind:'history',id:r.id,fence:state.fence});if(fault==='audit')throw Error('synthetic');return 1;
    },$queryRaw:async(strings:TemplateStringsArray,...v:any[])=>{const sql=strings.join('?').replace(/\s+/g,' ').trim();calls.push(sql);
      if(sql.includes('AS channel_available'))return [{channel_available:available}];
      if(sql.includes('to_regclass'))return [{available:true}];
      if(sql.includes('FROM pg_trigger'))return sql.includes('AS deferred')?copy(guards):issuerGuards.map(g=>({...g,enabled:true}));
      if(sql.includes('FROM pg_proc'))return [copy(shape)];
      if(sql.includes('AS channel_fence')){if(fault==='fence'&&!readonly)throw Error('synthetic');return [{channel_fence:String(state.fence)}];}
      if(sql.includes('AS channel_confirmed')){const r=JSON.parse(v[0]);return [{channel_confirmed:verified&&state.head?.id===r.id&&channelEqual(state.head.record,r)&&state.head.fence===String(state.fence)&&state.audit.some((a:any)=>a.id===r.id)}];}
      if(sql.includes('AS channel_ticket'))return [{channel_ticket:copy(f.ticket),digest:hash('5'),verified}];
      if(sql.includes('AS channel_grant'))return state.grants.map((g:any)=>({channel_grant:copy(g),verified}));
      if(sql.includes('FROM worker_transport_heads'))return state.head?[{...copy(state.head),verified}]:[];
      if(sql.startsWith('SELECT generation_id AS generation'))return state.history.map((r:any)=>({generation:state.head.generation,pin:state.head.pin,staged:null}));
      if(sql.startsWith('SELECT record_digest AS digest'))return [{digest:reviewDigest(state.history.find((r:any)=>r.id===v[0]))}];
      if(sql.includes('FROM decisions d'))return [{ownerId,revision:1,acceptanceId,intent:copy(intent),current}];
      if(sql.includes('worker_identity_lifecycle_guarded'))return [{guarded:true}];
      if(sql.includes('FROM worker_identity_lifecycle l'))return lifecycle.filter(r=>r.intent.kind===v[1]).map(record=>({record:copy(record),verified}));
      if(sql.includes('FROM bootstrap_issuer_history h'))return [{record:copy(issuer),fence:'1',verified}];
      if(sql.startsWith('SELECT revision,record_digest AS digest'))return [{revision:1,digest:hash('9')}];
      if(sql.includes('FROM trusted_provider_ticket_keys'))return [copy(key)];
      if(sql.includes('FROM api_keys'))return [{total:purpose==='first_enrollment'?0:1,active:0}];
      if(sql.includes('FROM ready_source_fence'))return [{revision:String(state.fence),isolation:option.isolationLevel==='Serializable'?'serializable':'repeatable read',readonly:readonly?'on':'off'}];
      assert.fail('unexpected channel query');
    }};
    try{const r=await work(db);if(!readonly&&fault==='precommit')throw Error('synthetic');
      if(!readonly&&fault==='false_ack'){Object.assign(state,saved);return r;}if(!readonly&&fault==='unknown')throw Error('synthetic');return r;
    }catch(e){if(fault!=='unknown')Object.assign(state,saved);throw e;}finally{release();}
  }};
  const store=createPrismaBootstrapChannelStore(client,f.now),command=()=>({ticketId:f.ticket.id,decisionId,decisionRevision:1,operationId:randomUUID()});
  const transition=(action='consume')=>({ticketId:f.ticket.id,operationId:randomUUID(),expectedRevision:state.head?.revision??1,action});
  return {...f,store,client,intent,command,transition,guards,shape,calls,options,lifecycle,key,state:()=>copy(state),mutate:(work:(s:any)=>void)=>work(state),fault:(v:string)=>fault=v,current:(v:boolean)=>current=v,available:(v:boolean)=>available=v,verified:(v:boolean)=>verified=v,counts:()=>({callbacks,appends})};
}

test('source-only canonical bootstrap transport adapter proposal',async t=>{
  let effects=0;const forbid=()=>{effects++;throw Error('effect forbidden');};
  for(const m of ['connect','createConnection'] as const)t.mock.method(net,m,forbid);t.mock.method(net.Server.prototype,'listen',forbid);t.mock.method(tls,'connect',forbid);
  for(const module of [http,https])for(const m of ['request','get'] as const)t.mock.method(module,m,forbid);
  for(const m of ['lookup','resolve','resolve4','resolve6'] as const){t.mock.method(dns,m,forbid);t.mock.method(dns.promises,m,forbid);}
  t.mock.method(globalThis,'fetch',forbid);for(const m of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'] as const)t.mock.method(childProcess,m,forbid);
  for(const m of ['generateKeyPair','generateKeyPairSync','createPrivateKey','sign'] as const)t.mock.method(crypto,m,forbid);
  const logs:unknown[]=[];for(const m of ['log','warn','error'] as const)t.mock.method(console,m,(...v:unknown[])=>logs.push(v));
  await t.test('first enrollment and recovery create immutable grant on the existing head and consume once',async()=>{
    for(const purpose of ['first_enrollment','owner_recovery'] as const){const f=fixture(purpose);await f.store.grant(f.command());assert.deepEqual((await f.store.inspect(f.ticket.id)).blockers,[]);
      const before=f.state();await f.store.transition(f.transition());assert.equal(f.state().generations.length,1);assert.deepEqual(f.state().grants,before.grants);assert.equal(f.state().head.record.action,'consume');
      assert.ok((await f.store.inspect(f.ticket.id)).blockers.length);await assert.rejects(f.store.transition(f.transition()));await f.store.transition(f.transition('close'));assert.equal(f.state().head.state,'revoked');
    }
  });
  await t.test('ordinary current head cannot grant and bootstrap has no ordinary credential identity',async()=>{
    const f=fixture();f.mutate(s=>s.head={id:randomUUID(),revision:1,highWater:1,purpose:null,state:'current',generation:randomUUID(),pin:hash('0'),record:{},fence:String(s.fence)});
    await assert.rejects(f.store.grant(f.command()));assert.equal(f.state().generations.length,0);
    const g=fixture();await g.store.grant(g.command());assert.ok(!('credentialId'in g.state().generations[0].identity));assert.equal(g.state().head.purpose,'first_enrollment');
  });
  await t.test('twenty competing grants and twenty consumes have exactly one winner each',async()=>{
    const f=fixture(),grants=await Promise.allSettled(Array.from({length:20},()=>f.store.grant(f.command())));assert.equal(grants.filter(r=>r.status==='fulfilled').length,1);
    const commands=Array.from({length:20},()=>f.transition()),consumes=await Promise.allSettled(commands.map(c=>f.store.transition(c)));assert.equal(consumes.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(f.state().grants.length,1);assert.equal(f.state().history.length,2);
  });
  await t.test('exact owner ticket lifecycle issuer and transport facts reject drift',async()=>{
    const reserved=fixture(),authority=await decisionAuthority({} as any,reserved.snapshot.binding.workspaceId,{workerBootstrapChannel:reserved.intent,authority:{domain:'ordinary_domain'}},{},
      {ownerUserId:reserved.ticket.ownerId,ownerActive:true,truncated:false,mandates:[],workers:[],labels:[]});
    assert.equal(authority.status,'owner_reserved');assert.equal(authority.reason,'bootstrap_channel');
    for(const change of [(f:any)=>f.current(false),(f:any)=>f.ticket.ownerId=randomUUID(),(f:any)=>f.lifecycle[1].state='revoked',(f:any)=>f.lifecycle[0].state='revoked',
      (f:any)=>f.snapshot.hostGeneration=randomUUID(),(f:any)=>f.snapshot.issuerHistoryDigest=hash('0'),(f:any)=>f.key.epoch=2,(f:any)=>f.snapshot.caDigest=hash('0'),
      (f:any)=>f.snapshot.leafPin=hash('0'),(f:any)=>f.snapshot.origin='https://other.example.com:443',(f:any)=>f.snapshot.highWaterEpoch=2]){
      const f=fixture();change(f);await assert.rejects(f.store.grant(f.command()));assert.equal(f.state().history.length,0);
    }
  });
  await t.test('approved IP set is exact sorted unique public IPv4; no normalization of approval',async()=>{
    for(const ips of [[],['127.0.0.1'],['9.9.9.9','8.8.8.8'],['8.8.8.8','8.8.8.8'],['2001:4860:4860::8888']]){const f=fixture();f.snapshot.publicAddresses=ips;assert.equal(channelGrantIntent.safeParse(f.intent).success,false);await assert.rejects(f.store.grant(f.command()));}
    const f=fixture();f.snapshot.publicAddresses=['1.1.1.1'];await assert.rejects(f.store.grant(f.command()));
  });
  await t.test('fence and source ABA permanently invalidate a grant, inspection remains read only',async()=>{
    const f=fixture();await f.store.grant(f.command());const before=f.state();for(let n=0;n<3;n++)assert.deepEqual((await f.store.inspect(f.ticket.id)).blockers,[]);assert.deepEqual(f.state(),before);
    f.mutate(s=>s.fence++);const changed=f.state();assert.ok((await f.store.inspect(f.ticket.id)).blockers.length);await assert.rejects(f.store.transition(f.transition()));assert.deepEqual(f.state(),changed);
    assert.ok(f.options.filter(o=>o.isolationLevel==='RepeatableRead').length>=3);
  });
  await t.test('expiry hard cutover and revoke are terminal; no key/generation replay',async()=>{
    for(const mode of ['expiry','cutover','revoke']){const f=fixture();if(mode==='cutover'){f.snapshot.cutoverAt=f.iso(1000);f.snapshot.recordDigest=channelSnapshotDigest(f.snapshot);}await f.store.grant(f.command());
      if(mode==='revoke')await f.store.transition(f.transition('revoke'));else f.advance(mode==='expiry'?60000:1000);
      assert.ok((await f.store.inspect(f.ticket.id)).blockers.length);await assert.rejects(f.store.transition(f.transition()));await assert.rejects(f.store.grant(f.command()));
    }
  });
  await t.test('all write phases roll back generation grant history head audit and fence',async()=>{
    for(const fault of ['fence','generation','grant','history','head','audit','precommit']){const f=fixture(),before=f.state();f.fault(fault);await assert.rejects(f.store.grant(f.command()));assert.deepEqual(f.state(),before,fault);assert.equal(f.counts().callbacks,1);}
    const f=fixture();await f.store.grant(f.command());const before=f.state();f.fault('audit');await assert.rejects(f.store.transition(f.transition()));assert.deepEqual(f.state(),before);
  });
  await t.test('false COMMIT ACK and unknown commit never retry and cannot return authority',async()=>{
    for(const fault of ['false_ack','unknown']){const f=fixture();f.fault(fault);await assert.rejects(f.store.grant(f.command()),e=>e instanceof ChannelReconciliationRequired&&e.deliveryUnknown&&!e.retryable);
      assert.equal(f.counts().callbacks,1);assert.equal(f.counts().appends,1);assert.equal(f.state().history.length,fault==='unknown'?1:0);
    }
  });
  await t.test('every missing disabled rebound changed or incorrectly deferred guard blocks writes and reads',async()=>{
    for(let n=0;n<channelGuards.length;n++)for(const mode of ['missing','disabled','rebound','changed','deferred']){const f=fixture();if(mode==='missing')f.guards.splice(n,1);else if(mode==='disabled')f.guards[n].enabled=false;else if(mode==='rebound')f.guards[n].function='wrong';else if(mode==='changed')f.guards[n].hash=hash('0');else f.guards[n].deferred=!f.guards[n].deferred;
      await assert.rejects(f.store.grant(f.command()));assert.equal(f.state().history.length,0);assert.ok((await f.store.inspect(f.ticket.id)).blockers.length);
    }
    for(const change of [(f:any)=>f.available(false),(f:any)=>f.shape.hash=hash('0'),(f:any)=>f.shape.enabled=false]){const f=fixture();change(f);await assert.rejects(f.store.grant(f.command()));}
  });
  await t.test('before-send denied consumes perform zero exchanges; post-consume drift closes as unknown',async()=>{
    const f=fixture();await f.store.grant(f.command());f.mutate(s=>s.fence++);let exchanges=0;try{await f.store.transition(f.transition());exchanges++;}catch{}assert.equal(exchanges,0);
    const g=fixture();await g.store.grant(g.command());await g.store.transition(g.transition());g.mutate(s=>s.fence++);await g.store.transition(g.transition('close'));assert.equal(g.state().head.record.action,'unknown');await assert.rejects(g.store.transition(g.transition()));
  });
  await t.test('canonical source removes only channel gap and retains decision and revocation blockers',async()=>{
    const f=fixture();await f.store.grant(f.command());const source=createCanonicalBootstrapAuthoritySource(f.now);
    await f.client.$transaction(async(db:any)=>{await db.$executeRaw`SET TRANSACTION READ ONLY`;const release=await source.bindTransaction!(db,'read');try{
      await assert.rejects(source.context(db,f.snapshot.binding,f.ticket.issuedAt,f.ticket.id),(e:any)=>e instanceof CanonicalBootstrapBlocked&&channelEqual(e.blockers,['bootstrap_ticket_revocation_unavailable','signed_current_decision_unavailable']));
    }finally{release();}},{isolationLevel:'RepeatableRead'});
  });
  await t.test('caller overrides and legacy/missing audit evidence remain blocked',async()=>{
    for(const field of ['url','ca','pin','ips','epoch','headers','snapshot','intent']){const f=fixture();await assert.rejects(f.store.grant({...f.command(),[field]:'override'}));assert.equal(f.state().history.length,0);}
    const f=fixture();f.available(false);await assert.rejects(f.store.grant(f.command()));const g=fixture();await g.store.grant(g.command());g.verified(false);assert.ok((await g.store.inspect(g.ticket.id)).blockers.length);
    const legacy=fixture();legacy.mutate(s=>s.head={id:randomUUID(),revision:1,highWater:1,purpose:null,state:'revoked',generation:randomUUID(),pin:hash('0'),record:{},fence:String(s.fence)});
    legacy.intent.expectedRevision=1;legacy.snapshot.revision=2;legacy.snapshot.certificateEpoch=2;legacy.snapshot.highWaterEpoch=2;
    legacy.snapshot.recordDigest=channelSnapshotDigest(legacy.snapshot);await assert.rejects(legacy.store.grant(legacy.command()));assert.equal(legacy.state().generations.length,0);
    const corrupt=fixture();await corrupt.store.grant(corrupt.command());corrupt.mutate(s=>s.head.revision++);assert.ok((await corrupt.store.inspect(corrupt.ticket.id)).blockers.length);
  });
  await t.test('proposal keeps ordinary constraints, explicit widening checks and reviewed guard bodies',()=>{
    const sql=readFileSync('prisma/migrations/20260923230000_bootstrap_transport_authority/migration.sql','utf8').replace(/\r/g,'');
    assert.match(sql,/purpose IS NULL AND credential_id IS NOT NULL/);assert.match(sql,/purpose IS NOT NULL AND credential_id IS NULL/);assert.match(sql,/ordinary_rows_not_preserved/);assert.match(sql,/CHECK\(purpose IS NOT NULL OR \(%s\)\)/);
    assert.doesNotMatch(sql,/\bUPDATE worker_transport_(?:generations|history|heads)\b|\bDELETE FROM\b|\bDEFAULT\b/);assert.match(sql,/CREATE CONSTRAINT TRIGGER transport_authority_commit_guard/);
    for(const g of channelGuards){const body=new RegExp('CREATE FUNCTION '+g.function+'\\([^)]*\\)[\\s\\S]*?AS \\$\\$([\\s\\S]*?)\\$\\$;').exec(sql)![1];assert.equal(createHash('sha256').update(body).digest('hex'),g.hash);}
    const shape=/CREATE FUNCTION transport_bootstrap_shape\([^)]*\)[\s\S]*?AS \$\$([\s\S]*?)\$\$;/.exec(sql)![1];assert.equal(createHash('sha256').update(shape).digest('hex'),channelShapeHash);
  });
  assert.equal(effects,0);assert.deepEqual(logs,[]);
});
