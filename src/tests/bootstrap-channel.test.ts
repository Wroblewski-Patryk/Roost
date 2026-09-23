import {bootstrapChannelFixture as fixture} from './bootstrap-channel-fixture';
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto,{randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import net from 'node:net';import tls from 'node:tls';import http from 'node:http';import https from 'node:https';import dns from 'node:dns';import childProcess from 'node:child_process';
import {bootstrapChannelSnapshot,bootstrapChannelWriters,bootstrapChannelGap,inspectBootstrapChannelModel,createBootstrapChannelModel} from '../modules/api-keys/bootstrap-channel-contract';
import {bootstrapChannel} from '../modules/api-keys/worker-bootstrap-contract';
import {transportIdentity} from '../modules/api-keys/worker-transport-contract';
import {persistedTransportRecord} from '../modules/api-keys/worker-transport-persistence-contract';
import {admissionSnapshot} from '../modules/api-keys/worker-transport-snapshot';
import {createWorkerTransportService} from '../modules/api-keys/worker-transport.service';
import {createCanonicalBootstrapAuthoritySource} from '../modules/api-keys/worker-bootstrap-authority-source';
import {reviewDigest} from '../modules/agent-runtime/task-review-contract';

const hash=(s:string)=>s.repeat(64),copy=<T>(v:T):T=>structuredClone(v);

test('bootstrap channel source-only proposal never becomes canonical or ordinary authority',async t=>{
  let effects=0;const forbid=()=>{effects++;throw Error('external effect forbidden');};
  for(const m of ['connect','createConnection'] as const)t.mock.method(net,m,forbid);t.mock.method(net.Server.prototype,'listen',forbid);t.mock.method(tls,'connect',forbid);
  for(const module of [http,https])for(const m of ['request','get'] as const)t.mock.method(module,m,forbid);
  for(const m of ['lookup','resolve','resolve4','resolve6'] as const){t.mock.method(dns,m,forbid);t.mock.method(dns.promises,m,forbid);}
  t.mock.method(globalThis,'fetch',forbid);for(const m of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'] as const)t.mock.method(childProcess,m,forbid);
  for(const m of ['generateKeyPair','generateKeyPairSync','createPrivateKey','sign'] as const)t.mock.method(crypto,m,forbid);
  const logs:unknown[]=[];for(const m of ['log','warn','error'] as const)t.mock.method(console,m,(...v:unknown[])=>logs.push(v));
  await t.test('explicit mocked first enrollment and terminal recovery validate and exchange once',async()=>{
    for(const purpose of ['first_enrollment','owner_recovery'] as const){const f=fixture(purpose),r=await f.model.run(f.input());assert.equal(r.ok,true);assert.equal(r.qualification,'source_model_only');assert.deepEqual(f.counts(),{inspects:4,exchanges:1});
      for(const flag of ['implementationReady','executionSupported','pilotReady','liveAdmissionAllowed','pilotExecutionAuthorized','pilotExecutionStarted','transportQualified','launchAuthority'] as const)assert.equal(r[flag],false);
      const repeated=await f.model.run(f.input());assert.equal(repeated.ok,false);assert.equal(f.counts().exchanges,1);
    }
  });
  await t.test('canonical/default source stays blocked and reports exact representation and writer gaps',async()=>{
    const f=fixture(),source=createCanonicalBootstrapAuthoritySource(f.now),r=await source.inspect({} as any,{});
    assert.deepEqual(r.channelAuthority,bootstrapChannelGap);assert.equal(r.channelAuthority.available,false);assert.ok(r.blockers.includes('bootstrap_channel_authority_unavailable'));
    for(const code of ['bootstrap_ticket_revocation_unavailable','signed_current_decision_unavailable'])assert.ok(r.blockers.includes(code));
    assert.equal((await createBootstrapChannelModel().run(f.input())).ok,false);assert.equal((await createBootstrapChannelModel({...f.dependencies,qualification:'canonical' as any}).run(f.input())).ok,false);
  });
  await t.test('ordinary and ambiguous legacy records cannot be reinterpreted as bootstrap',async()=>{
    const f=fixture(),{hostEpoch,installationEpoch,...binding}=f.snapshot.binding;
    const ordinary={version:'worker-transport-record-v1',identity:{...binding,credentialId:randomUUID(),credentialVersion:1,credentialEpoch:1,credentialFingerprint:hash('8')},profile:f.profile,
      revision:1,certificateEpoch:1,highWaterEpoch:1,staged:null,state:'current',ownerId:f.ticket.ownerId,decisionId:f.ticket.decisionId,decisionRevision:1,decisionIntentDigest:hash('9'),approvedAt:f.iso(-1000),expiresAt:f.iso(60000),requestId:f.intent.requestId};
    assert.equal(persistedTransportRecord.safeParse(ordinary).success,true);
    assert.equal(bootstrapChannelSnapshot.safeParse(ordinary).success,false);
    for(const patch of [{purpose:'ordinary'},{purpose:undefined},{version:'worker-transport-record-v1'},{credentialId:randomUUID()}])assert.equal(bootstrapChannelSnapshot.safeParse({...f.snapshot,...patch}).success,false);
    assert.equal(transportIdentity.safeParse(f.snapshot.binding).success,false);assert.equal(admissionSnapshot.safeParse(f.snapshot).success,false);
    assert.equal(persistedTransportRecord.safeParse({...ordinary,bootstrapPurpose:'first_enrollment'}).success,false);
    assert.equal(bootstrapChannel.safeParse({...f.intent.channel,publicAddresses:f.snapshot.publicAddresses}).success,false);
  });
  await t.test('credential absence is not authority and normal inspection still requires an active credential',async()=>{
    const f=fixture();delete f.proof.grant;assert.throws(()=>inspectBootstrapChannelModel(f.proof,f.now()));
    for(const purpose of ['first_enrollment','owner_recovery'] as const){const g=fixture(purpose);g.proof.credentialState=purpose==='first_enrollment'?'terminal':'absent';assert.throws(()=>inspectBootstrapChannelModel(g.proof,g.now()));}
    const b=f.snapshot.binding,{hostEpoch,installationEpoch,...base}=b,identity={...base,credentialId:randomUUID(),credentialVersion:1,credentialEpoch:1,credentialFingerprint:hash('8')};
    for(const context of [null,{identity,ownerId:randomUUID(),ownerActive:true,hostActive:true,credentialActive:false,publicKey:'never-read'}]){
      const tx:any={context:async()=>context,head:forbid},store:any={read:async(work:any)=>work(tx),transaction:forbid};
      const result=await createWorkerTransportService(store).inspect({} as any,{identity,revision:1,recordDigest:hash('9'),certificateEpoch:1,highWaterEpoch:1});assert.equal(result.ok,false);assert.equal(result.error,'identity_changed');
    }
  });
  await t.test('owner decision ticket issuer and lifecycle evidence must agree exactly',()=>{
    const changes=[(p:any)=>p.owner.id=randomUUID(),(p:any)=>p.owner.solePrimary=false,(p:any)=>p.owner.active=false,(p:any)=>p.grant.ticketId=randomUUID(),
      (p:any)=>p.grant.snapshotDigest=hash('0'),(p:any)=>p.acceptedGrantDigest=hash('0'),(p:any)=>p.decision.revision=2,(p:any)=>p.decision.state='revoked',
      (p:any)=>p.ticket.decisionIntentDigest=hash('0'),(p:any)=>p.ticketCurrent=false,(p:any)=>p.decisionCurrent=false,(p:any)=>p.issuer.current=false,
      (p:any)=>p.issuer.revision=2,(p:any)=>p.issuer.historyDigest=hash('0'),(p:any)=>p.lifecycle.hostActive=false,(p:any)=>p.lifecycle.installationActive=false,
      (p:any)=>p.lifecycle.hostGeneration=randomUUID(),(p:any)=>p.lifecycle.installationGeneration=randomUUID(),(p:any)=>p.issuer.binding.ticketKeyEpoch=2];
    for(const change of changes){const f=fixture();change(f.proof);assert.throws(()=>inspectBootstrapChannelModel(f.proof,f.now()));}
    for(const key of ['workspaceId','installationId','hostId']){const f=fixture();f.proof.lifecycle.binding[key]=randomUUID();assert.throws(()=>inspectBootstrapChannelModel(f.proof,f.now()));}
    for(const key of ['grant','decision','ticket','issuer','lifecycle','fence']){const f=fixture();delete f.proof[key];assert.throws(()=>inspectBootstrapChannelModel(f.proof,f.now()));}
  });
  await t.test('stale or revoked channel certificate cutover expiry and fence gaps deny',()=>{
    for(const change of [(p:any)=>p.channelCurrent=false,(p:any)=>p.certificateCurrent=false,(p:any)=>p.snapshot.state='revoked',(p:any)=>p.snapshot.highWaterEpoch=0,
      (p:any)=>p.snapshot.certificateEpoch=2,(p:any)=>p.snapshot.cutoverAt=p.ticket.issuedAt,(p:any)=>p.snapshot.expiresAt='2000-01-01T00:00:00.000Z',
      (p:any)=>p.fence.mode='serializable',(p:any)=>p.fence.writers.pop(),(p:any)=>p.fence.writers[0]='transport_head']){const f=fixture();change(f.proof);assert.throws(()=>inspectBootstrapChannelModel(f.proof,f.now()));}
    const f=fixture();f.advance(60000);assert.throws(()=>inspectBootstrapChannelModel(f.proof,f.now()));
    const g=fixture();g.snapshot.cutoverAt=g.iso(1000);g.proof.grant.snapshotDigest=reviewDigest(g.snapshot);g.proof.acceptedGrantDigest=reviewDigest(g.proof.grant);
    inspectBootstrapChannelModel(g.proof,g.now());g.advance(1000);assert.throws(()=>inspectBootstrapChannelModel(g.proof,g.now()));
  });
  await t.test('origin SNI CA leaf resolver IP and forbidden policy changes deny before exchange',async()=>{
    for(const patch of [{origin:'https://other.example.com:443'},{serverName:'other.example.com'},{caDigest:hash('0')},{leafPin:hash('0')},{resolverPolicy:'any'},
      {publicAddresses:['127.0.0.1']},{publicAddresses:['8.8.8.8','8.8.8.8']},{publicAddresses:['1.1.1.1']},{proxy:true},{redirect:true},{sessionReuse:true}]){
      const f=fixture();Object.assign(f.snapshot,patch);assert.equal((await f.model.run(f.input())).ok,false);assert.equal(f.counts().exchanges,0);
    }
  });
  await t.test('fresh inspect denies drift before send with zero exchange and no automatic retry',async()=>{
    for(const change of [(p:any)=>p.owner.active=false,(p:any)=>p.snapshot.revision++,(p:any)=>p.fence.revision++,(p:any)=>p.issuer.current=false]){
      const f=fixture();f.hooks.inspect=n=>{if(n===2)change(f.proof);};assert.equal((await f.model.run(f.input())).ok,false);assert.equal(f.counts().exchanges,0);
      await f.model.run(f.input());assert.equal(f.counts().inspects,2);
    }
  });
  await t.test('peer proof must use the exact snapshot and fresh canonical inspection',async()=>{
    for(const patch of [{origin:'https://other.example.com:443'},{serverName:'other.example.com'},{caDigest:hash('0')},{leafPin:hash('0')},{certificateEpoch:2},
      {publicAddresses:['1.1.1.1']},{peerAddress:'1.1.1.1'},{resolverPolicy:'any'},{chainValid:false},{sessionReuse:true},{requestId:randomUUID()}]){
      const f=fixture();f.hooks.peer=p=>Object.assign(p,patch);const r=await f.model.run(f.input());assert.equal(r.ok,false);assert.equal('deliveryUnknown'in r&&r.deliveryUnknown,true);assert.equal(f.counts().exchanges,1);
    }
    const f=fixture();f.hooks.inspect=n=>{if(n===3)f.proof.channelCurrent=false;};assert.equal((await f.model.run(f.input())).ok,false);
  });
  await t.test('post possible commit drift uncertain or lost response is terminal unknown without replay',async()=>{
    for(const change of [(f:any)=>f.proof.issuer.current=false,(f:any)=>f.proof.lifecycle.hostActive=false,(f:any)=>f.proof.ticketCurrent=false,(f:any)=>f.proof.snapshot.publicAddresses=['1.1.1.1'],(f:any)=>f.advance(60000)]){
      const f=fixture();f.hooks.after=()=>change(f);const r=await f.model.run(f.input());assert.equal('deliveryUnknown'in r&&r.deliveryUnknown,true);await f.model.run(f.input());assert.equal(f.counts().exchanges,1);
    }
    for(const reply of [()=>{throw Error('synthetic lost response');},(r:any)=>({...r,commitUncertain:true}),(r:any)=>({...r,peerDigest:hash('0')})]){
      const f=fixture();f.hooks.reply=reply;const r=await f.model.run(f.input());assert.equal('deliveryUnknown'in r&&r.deliveryUnknown,true);await f.model.run(f.input());assert.equal(f.counts().exchanges,1);
    }
    const f=fixture();let release!:()=>void,entered!:()=>void;const gate=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>entered=r);
    const model=createBootstrapChannelModel({...f.dependencies,exchange:async()=>{entered();await gate;throw Error('unproven exchange outcome');}},f.now);
    const pending=model.run(f.input());await ready;const concurrent=await model.run(f.input());assert.equal('deliveryUnknown'in concurrent&&concurrent.deliveryUnknown,true);
    release();assert.equal('deliveryUnknown'in (await pending),true);assert.equal((await model.run(f.input())).ok,false);
  });
  await t.test('caller cannot override URL CA pin epoch headers resolver snapshot or ordinary action',async()=>{
    for(const key of ['url','origin','ca','pin','epoch','headers','resolver','snapshot','action']){const f=fixture();const r=await f.model.run({...f.input(),[key]:'caller-value'});assert.equal(r.ok,false);assert.deepEqual(f.counts(),{inspects:0,exchanges:0});}
    const f=fixture();assert.equal((await f.model.run(f.input(),{})).ok,false);assert.equal(f.counts().exchanges,0);
  });
  await t.test('inspection is pure with recursively immutable detached public snapshots',()=>{
    const f=fixture(),before=copy(f.proof),r=inspectBootstrapChannelModel(f.proof,f.now());for(let n=0;n<3;n++)inspectBootstrapChannelModel(f.proof,f.now());assert.deepEqual(f.proof,before);
    assert.ok(Object.isFrozen(r.snapshot.publicAddresses));assert.throws(()=>{r.snapshot.publicAddresses.push('1.1.1.1');});f.snapshot.caDigest=hash('0');assert.equal(r.snapshot.caDigest,hash('d'));
  });
  await t.test('source inventory proves mandatory credential strict purpose absence and unfenced SQL writers',()=>{
    const sql=readFileSync('prisma/migrations/20260923170000_worker_transport_admission/migration.sql','utf8'),store=readFileSync('src/modules/api-keys/worker-transport-store.ts','utf8');
    assert.match(sql,/credential_id UUID NOT NULL REFERENCES api_keys/);assert.match(sql,/CHECK\(record-ARRAY\[/);assert.match(sql,/record->'profile'->'resolver'='/);
    assert.doesNotMatch(sql,/CREATE (?:CONSTRAINT )?TRIGGER|ready_source_fence/);assert.match(store,/UPDATE ready_source_fence SET revision=revision\+1/);
    assert.match(store,/workerTransportHead.updateMany/);assert.match(store,/workerTransportHistory.create/);assert.match(store,/workerTransportAudit.create/);
    const source=readFileSync('src/modules/api-keys/worker-bootstrap-authority-source.ts','utf8');assert.doesNotMatch(source,/\bINSERT INTO\b|\bUPDATE\b|\.sign\(/);
  });
  assert.equal(effects,0);assert.deepEqual(logs,[]);
});
