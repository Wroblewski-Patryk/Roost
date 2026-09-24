import test from 'node:test';import assert from 'node:assert/strict';import crypto,{randomUUID} from 'node:crypto';
import net from 'node:net';import tls from 'node:tls';import http from 'node:http';import https from 'node:https';import dns from 'node:dns';import childProcess from 'node:child_process';
import {bootstrapChannelFixture} from './bootstrap-channel-fixture';
import {signedDecisionGap,signedDecisionWriters,signedDecisionPayloadDigest,signedDecisionPublicKeyDigest,
 inspectSignedDecisionModel,createSignedDecisionModel} from '../modules/api-keys/bootstrap-signed-decision-contract';
import {createCanonicalBootstrapAuthoritySource,CanonicalBootstrapBlocked} from '../modules/api-keys/worker-bootstrap-authority-source';
import {reviewDigest} from '../modules/agent-runtime/task-review-contract';
const hash=(s:string)=>s.repeat(64),copy=<T>(v:T):T=>structuredClone(v);
function fixture(purpose:'first_enrollment'|'owner_recovery'='first_enrollment'){
 const f=bootstrapChannelFixture(purpose),keyHex='d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a';
 const key:any={id:randomUUID(),workspaceId:f.snapshot.binding.workspaceId,ownerId:f.ticket.ownerId,revision:1,epoch:1,
  purpose:'bootstrap-current-owner-decision-v1',algorithm:'Ed25519',publicKeyHex:keyHex,publicKeyDigest:signedDecisionPublicKeyDigest(keyHex),historyDigest:hash('a'),
  validFrom:f.iso(-60000),expiresAt:f.iso(120000),state:'current'};
 const b:any={version:'bootstrap-signed-current-decision-proposal-v1',decisionId:f.ticket.decisionId,decisionRevision:1,revisionDigest:hash('b'),acceptanceId:randomUUID(),
  ownerId:f.ticket.ownerId,binding:copy(f.snapshot.binding),purpose,intentDigest:reviewDigest(f.intent),evidenceDigest:hash('c'),ticketId:f.ticket.id,
  ticketContentDigest:hash('d'),ticketEnvelopeDigest:hash('e'),hostGeneration:f.snapshot.hostGeneration,installationGeneration:f.snapshot.installationGeneration,
  issuerRevision:1,issuerHistoryDigest:hash('f'),channelGrantId:randomUUID(),channelGrantRevision:1,channelGrantDigest:hash('1'),policyRevision:1,
  validFrom:f.iso(-500),expiresAt:f.iso(60000),signingKeyId:key.id,signingKeyRevision:1,signingKeyEpoch:1,signingPublicKeyDigest:key.publicKeyDigest,signingKeyHistoryDigest:key.historyDigest};
 const signedDigest=signedDecisionPayloadDigest(b);
 const p:any={qualification:'synthetic_signed_decision_proof_v1',payload:b,signature:'1'.repeat(128),key,
  current:{binding:copy(b),candidateCount:1,primaryOwnerId:b.ownerId,ownerMembershipIds:[b.ownerId],state:'accepted',successorCount:0,
   acceptance:{id:b.acceptanceId,decisionId:b.decisionId,workspaceId:b.binding.workspaceId,actorUserId:b.ownerId,actorAgentId:null,actorCredentialId:null,authority:'owner_reserved',acceptedAt:f.iso(-2000)}},
  history:[],audit:[],historyHeadDigest:hash('0'),fence:10,mode:'read_only_repeatable_read',origin:true,
  guards:signedDecisionWriters.map(writer=>({writer,enabled:true,binding:'exact',definition:'reviewed',configuration:'exact'}))};
 function append(action:string,at=f.iso()){
  const e={id:randomUUID(),revision:p.history.length+1,action,at,revisionDigest:b.revisionDigest,
   signedPayloadDigest:action==='sign'?signedDigest:null,previousDigest:p.history.length?reviewDigest(p.history.at(-1)):null};
  p.history.push(e);p.audit.push({eventId:e.id,eventDigest:reviewDigest(e),fence:++p.fence});p.historyHeadDigest=reviewDigest(e);
 }
 append('create',f.iso(-3000));append('accept',f.iso(-2000));append('sign',f.iso(-500));
 let reads=0,exchanges=0,verifications=0;const snapshots=new WeakMap<object,any>(),hooks:{read?:(n:number)=>void;verify?:()=>void;exchange?:()=>void}={};
 const dependencies={qualification:'synthetic_signed_decision_model_v1' as const,
  withRead:async<T>(work:(db:any)=>Promise<T>)=>{const db={};return work(db);},
  transaction:async(db:any)=>({fence:snapshots.get(db)?.fence??p.fence,isolation:'repeatable read',readOnly:true,origin:true}),
  read:async(db:any,q:any)=>{assert.deepEqual(q,{decisionId:b.decisionId,ticketId:b.ticketId});reads++;hooks.read?.(reads);const snapshot=copy(p);snapshots.set(db,snapshot);return snapshot;},
  verifier:{qualification:'synthetic_signed_decision_verifier_v1' as const,verify:async(db:any,e:any)=>{
   verifications++;assert.ok(snapshots.has(db));assert.ok(Object.isFrozen(e)&&Object.isFrozen(e.key)&&Object.isFrozen(e.payload));hooks.verify?.();
   return e.signature==='1'.repeat(128)&&e.payloadDigest===signedDigest;
  }},exchange:async(expected:any)=>{exchanges++;assert.ok(Object.isFrozen(expected));
   // Mock atomic writer check: no claim that paired reads close the dispatch race.
   assert.equal(expected.digest,reviewDigest(inspectSignedDecisionModel(p,f.now())));assert.equal(expected.fence,p.fence);hooks.exchange?.();}
 };
 return {p,b,hooks,append,dependencies,now:f.now,advance:f.advance,iso:f.iso,input:()=>({decisionId:b.decisionId,ticketId:b.ticketId}),
  model:createSignedDecisionModel(dependencies,f.now),counts:()=>({reads,exchanges,verifications})};
}
test('source-only signed current decision contract and denial model',async t=>{
 let effects=0;const forbid=()=>{effects++;throw Error('external effect forbidden');};
 for(const m of ['connect','createConnection'] as const)t.mock.method(net,m,forbid);t.mock.method(net.Server.prototype,'listen',forbid);t.mock.method(tls,'connect',forbid);
 for(const module of [http,https])for(const m of ['request','get'] as const)t.mock.method(module,m,forbid);
 for(const m of ['lookup','resolve','resolve4','resolve6'] as const){t.mock.method(dns,m,forbid);t.mock.method(dns.promises,m,forbid);}
 t.mock.method(globalThis,'fetch',forbid);for(const m of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'] as const)t.mock.method(childProcess,m,forbid);
 for(const m of ['generateKeyPair','generateKeyPairSync','createPrivateKey','sign'] as const)t.mock.method(crypto,m,forbid);
 const logs:unknown[]=[];for(const m of ['log','warn','error'] as const)t.mock.method(console,m,(...v:unknown[])=>logs.push(v));
 await t.test('complete modeled signature accepts both purposes using same-transaction verifier and two fresh projections',async()=>{
  for(const purpose of ['first_enrollment','owner_recovery'] as const){const f=fixture(purpose),r=await f.model.run(f.input());assert.equal(r.ok,true);assert.deepEqual(f.counts(),{reads:4,exchanges:1,verifications:4});
   for(const flag of ['implementationReady','executionSupported','pilotReady','liveAdmissionAllowed','pilotExecutionAuthorized','pilotExecutionStarted','transportQualified','launchAuthority'])assert.equal((r as any)[flag],false);}
 });
 await t.test('ordinary acceptance, missing and false verifier cannot supply a signature',async()=>{
  const f=fixture();assert.equal((await createSignedDecisionModel().run(f.input())).ok,false);
  assert.equal((await createSignedDecisionModel({...f.dependencies,verifier:undefined},f.now).run(f.input())).ok,false);
  for(const value of [undefined,'',hash('0'),'0'.repeat(128)]){const g=fixture();g.p.signature=value;assert.equal((await g.model.run(g.input())).ok,false);assert.equal(g.counts().exchanges,0);}
 });
 await t.test('legacy or incomplete current evidence cannot become authority',async()=>{
  for(const field of ['key','history','audit','historyHeadDigest','current','guards']){const f=fixture();delete f.p[field];assert.equal((await f.model.run(f.input())).ok,false);assert.equal(f.counts().exchanges,0);}
 });
 await t.test('every signed binding differs from independent current truth or signed bytes: denied',async()=>{
  const f=fixture();for(const field of Object.keys(f.b)){
   if(field==='version')continue;
   const g=fixture(),v=g.p.current.binding[field];g.p.current.binding[field]=typeof v==='number'?v+1:typeof v==='object'?{...v,hostEpoch:2}:v==='first_enrollment'?'owner_recovery':typeof v==='string'&&v.length===64?hash('0'):randomUUID();
   assert.equal((await g.model.run(g.input())).ok,false,field);assert.equal(g.counts().exchanges,0);
  }
  const g=fixture();g.b.intentDigest=hash('0');g.p.current.binding.intentDigest=hash('0');assert.equal((await g.model.run(g.input())).ok,false);
 });
 await t.test('owner transfer, extra owners, candidate ambiguity and agent acceptance deny',async()=>{
  for(const mutate of [(p:any)=>p.current.primaryOwnerId=randomUUID(),(p:any)=>p.current.ownerMembershipIds=[],(p:any)=>p.current.ownerMembershipIds.push(randomUUID()),
   (p:any)=>p.current.candidateCount=2,(p:any)=>p.current.successorCount=1,(p:any)=>p.current.acceptance.actorUserId=randomUUID(),
   (p:any)=>p.current.acceptance.actorAgentId=randomUUID(),(p:any)=>p.current.acceptance.actorCredentialId=randomUUID(),(p:any)=>p.current.acceptance.authority='delegated']){
   const f=fixture();mutate(f.p);assert.equal((await f.model.run(f.input())).ok,false);assert.equal(f.counts().exchanges,0);}
 });
 await t.test('revise/reject/revoke/supersede/expire/delete are terminal for the attestation',async()=>{
  for(const action of ['revise','reject','revoke','supersede','expire','delete']){const f=fixture();f.append(action);assert.equal((await f.model.run(f.input())).ok,false);assert.equal(f.counts().exchanges,0);}
 });
 await t.test('future/expired validity and expiry during verification deny without writes',async()=>{
  for(const offset of [-1000,60000]){const f=fixture();f.advance(offset);const before=copy(f.p);assert.equal((await f.model.status(f.input())).ok,false);assert.deepEqual(f.p,before);}
  const f=fixture();f.hooks.verify=()=>f.advance(60000);assert.equal((await f.model.run(f.input())).ok,false);assert.equal(f.counts().exchanges,0);
 });
 await t.test('key material/purpose/revision/epoch/history/owner/workspace/validity must all be current',async()=>{
  for(const change of [(p:any)=>p.key.publicKeyHex=hash('0'),(p:any)=>p.key.purpose='worker-bootstrap-owner-ticket-v1',(p:any)=>p.key.revision++,
   (p:any)=>p.key.epoch++,(p:any)=>p.key.historyDigest=hash('0'),(p:any)=>p.key.ownerId=randomUUID(),(p:any)=>p.key.workspaceId=randomUUID(),
   (p:any)=>p.key.state='revoked',(p:any)=>delete p.key.historyDigest,(p:any)=>p.key.expiresAt=p.payload.validFrom]){
   const f=fixture();change(f.p);assert.equal((await f.model.run(f.input())).ok,false);assert.equal(f.counts().exchanges,0);}
 });
 await t.test('every writer requires exact enabled coverage; replica and changed configuration deny',async()=>{
  for(let i=0;i<signedDecisionWriters.length;i++)for(const field of ['missing','enabled','binding','definition','configuration']){
   const f=fixture();if(field==='missing')f.p.guards.splice(i,1);else f.p.guards[i][field]=field==='enabled'?false:'other';assert.equal((await f.model.run(f.input())).ok,false);assert.equal(f.counts().exchanges,0);}
  const f=fixture();f.p.origin=false;assert.equal((await f.model.run(f.input())).ok,false);
 });
 await t.test('missing or stale history/audit receipt and changed fences cannot be accepted',async()=>{
  for(const mutate of [(p:any)=>p.history.pop(),(p:any)=>p.audit.pop(),(p:any)=>p.historyHeadDigest=hash('0'),(p:any)=>p.audit[1].eventDigest=hash('0'),
   (p:any)=>p.audit[1].fence=p.audit[0].fence,(p:any)=>p.fence=1,(p:any)=>p.history[1].previousDigest=hash('0')]){const f=fixture();mutate(f.p);assert.equal((await f.model.run(f.input())).ok,false);assert.equal(f.counts().exchanges,0);}
  const f=fixture();f.hooks.read=n=>{if(n===2)f.p.fence++;};assert.equal((await f.model.run(f.input())).ok,false);assert.equal(f.counts().exchanges,0);
 });
 await t.test('transaction mode/rebind/freshness fails closed',async()=>{
  for(const tx of [{fence:13,isolation:'serializable',readOnly:true,origin:true},{fence:13,isolation:'repeatable read',readOnly:false,origin:true}]){
   const f=fixture();f.dependencies.transaction=async()=>tx;assert.equal((await f.model.run(f.input())).ok,false);}
  const f=fixture(),db={};f.dependencies.withRead=async work=>work(db);assert.equal((await f.model.run(f.input())).ok,false);assert.equal(f.counts().exchanges,0);
  const g=fixture();let count=0;g.dependencies.transaction=async()=>({fence:13+(count++?1:0),isolation:'repeatable read',readOnly:true,origin:true});assert.equal((await g.model.run(g.input())).ok,false);
 });
 await t.test('twenty shared concurrent readers across each revise/accept/revoke interleaving deny before send',async()=>{
  for(const action of ['revise','accept','revoke']){
   const f=fixture(),original=f.dependencies.read;let entered=0,release!:()=>void,ready!:()=>void;
   const gate=new Promise<void>(r=>release=r),allEntered=new Promise<void>(r=>ready=r);
   f.dependencies.read=async(db,q)=>{const snapshot=await original(db,q);if(++entered<=20){if(entered===20)ready();await gate;}return snapshot;};
   const work=Array.from({length:20},()=>f.model.run(f.input()));await allEntered;
   if(action==='accept'){f.p.current.acceptance.id=randomUUID();f.p.fence++;}else f.append(action);
   release();const results=await Promise.all(work);assert.equal(results.length,20);assert.ok(results.every(r=>!r.ok));assert.equal(f.counts().exchanges,0);
  } // In-memory shared snapshots, not PostgreSQL concurrency evidence.
 });
 await t.test('post-send revoke, changed authority, failed readback or uncertain exchange never retries',async()=>{
  for(const mode of ['revoke','owner','expiry','readback','unknown']){const f=fixture();f.hooks.exchange=()=>{
   if(mode==='revoke')f.append('revoke');if(mode==='owner')f.p.current.primaryOwnerId=randomUUID();if(mode==='expiry')f.advance(60000);
   if(mode==='unknown')throw Error('unknown commit');if(mode==='readback')f.hooks.read=()=>{throw Error('readback unavailable');};};
   const r=await f.model.run(f.input());assert.equal('error'in r&&r.error,'delivery_unknown');assert.equal('reconciliationRequired'in r&&r.reconciliationRequired,true);assert.equal(r.retryable,false);assert.equal(f.counts().exchanges,1);}
 });
 await t.test('read-only status is pure and every request override is denied',async()=>{
  const f=fixture(),before=copy(f.p);assert.equal((await f.model.status(f.input())).ok,true);assert.deepEqual(f.p,before);assert.equal(f.counts().exchanges,0);
  for(const field of ['signature','ownerId','verifier','key','decisionRevision','policyRevision','fence','url','target','profile','model','accepted','force','binding']){
   const input={...f.input(),[field]:'override'};assert.equal((await f.model.run(input)).ok,false);assert.equal((await f.model.status(input)).ok,false);}
  assert.deepEqual(f.p,before);assert.equal(f.counts().exchanges,0);
 });
 await t.test('canonical diagnostics expose exact gaps but decision() remains blocked',async()=>{
  const f=fixture(),source=createCanonicalBootstrapAuthoritySource(f.now),db:any={$queryRaw:async()=>[{revision:'1',isolation:'repeatable read',readonly:'on'}]};
  const release=await source.bindTransaction!(db,'read');try{await assert.rejects(source.decision(db,f.b.decisionId),(e:any)=>e instanceof CanonicalBootstrapBlocked&&e.blockers.includes('signed_current_decision_unavailable'));
   const result=await source.inspect(db,{});assert.deepEqual(result.decisionAuthority,signedDecisionGap);assert.equal(result.ok,false);
  }finally{release();}
 });
 assert.equal(effects,0);assert.deepEqual(logs,[]);
});
