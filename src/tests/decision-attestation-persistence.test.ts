import test from 'node:test';import assert from 'node:assert/strict';import crypto,{randomUUID} from 'node:crypto';
import net from 'node:net';import tls from 'node:tls';import http from 'node:http';import https from 'node:https';import dns from 'node:dns';import childProcess from 'node:child_process';
import {bootstrapChannelFixture} from './bootstrap-channel-fixture';
import {attestationDigest as digest,attestationKeyPurpose,projectAttestationKeys} from '../modules/api-keys/decision-attestation-key-model';
import {attestationWriters,attestationSourceVersion,inspectAttestationState,recordAttestationSourceWrite,recordAttestationKeyWrite,
 createAttestationPersistenceModel,AttestationCommitUnknown,type AttestationModelDependencies,type AttestationModelState} from '../modules/api-keys/decision-attestation-persistence-model';
const hash=(s:string)=>s.repeat(64),copy=<T>(x:T):T=>structuredClone(x);
function fixture(purpose:'first_enrollment'|'owner_recovery'='first_enrollment',adopt=false,interview=false){
 const f=bootstrapChannelFixture(purpose),b:any={decisionId:f.ticket.decisionId,decisionRevision:1,revisionDigest:hash('1'),acceptanceId:randomUUID(),ownerId:f.ticket.ownerId,
  binding:copy(f.snapshot.binding),purpose,intentDigest:hash('2'),evidenceDigest:hash('3'),ticketId:f.ticket.id,ticketContentDigest:hash('4'),ticketEnvelopeDigest:hash('5'),
  hostGeneration:f.snapshot.hostGeneration,installationGeneration:f.snapshot.installationGeneration,issuerRevision:1,issuerHistoryDigest:hash('6'),
  channelGrantId:randomUUID(),channelGrantRevision:1,channelGrantDigest:hash('7'),policyRevision:1,validFrom:f.iso(-500),expiresAt:f.iso(60000)};
 let state:AttestationModelState={qualification:'synthetic_attestation_persistence_v1',canonical:{ceremony:b,primaryOwnerId:b.ownerId,ownerMembershipIds:[b.ownerId],
  candidateCount:1,status:'proposed',authorityRevision:0,acceptance:null,auth:null},keys:[],attestations:[],seals:[],journal:[],receipts:[],fence:1,
  guards:attestationWriters.map(writer=>({writer,enabled:true,binding:'exact',definition:'reviewed',configuration:'exact'})),origin:true};
 state=recordAttestationSourceWrite(state,'create',state.canonical,new Date(f.iso(-4000)));
 function material(epoch=1){const publicKey=epoch===1?'d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a':'3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c';
  return {keyId:randomUUID(),epoch,purpose:attestationKeyPurpose,algorithm:'Ed25519' as const,format:'raw-public-hex' as const,publicKey,
   publicKeyDigest:digest('owner-decision-public-key-v1',{algorithm:'Ed25519',format:'raw-public-hex',publicKey}),
   provenance:{kind:'installation_secret_store' as const,installationId:b.binding.installationId,authorizationDigest:hash('8'),publicMaterialEvidenceDigest:hash('9')},validFrom:f.iso(-5000),expiresAt:f.iso(240000)};
 }
 const first=material();state=recordAttestationKeyWrite(state,{id:randomUUID(),action:adopt?'adopt':'create',keyId:first.keyId,material:first,overlapStartsAt:null,cutoverAt:null},new Date(f.iso(-3000)));
 const c=copy(state.canonical);c.status='accepted';c.acceptance={id:b.acceptanceId,ownerId:b.ownerId,workspaceId:b.binding.workspaceId,decisionId:b.decisionId,revision:1,
  acceptedAt:f.iso(-2000),authority:'owner_reserved',actorAgentId:null,actorCredentialId:null};
 c.auth={version:'roost-owner-auth-evidence-v1',workspaceId:b.binding.workspaceId,ownerId:b.ownerId,acceptanceId:b.acceptanceId,level:'roost_session',
  authTime:f.iso(-2500),acceptedAt:f.iso(-2000),sessionEvidenceDigest:hash('a'),policyRevision:1};
 state=recordAttestationSourceWrite(state,interview?'interview_acceptance_effect':'accept',c,new Date(f.iso(-2000)));
 let tail=Promise.resolve(),writes=0,exchanges=0,signatures=0,verifications=0;
 let fault:{writer:string;point:'state'|'history'|'audit'|'fence'|'commit_ack'}|null=null;
 const hooks:{beforeWrite?:(n:number)=>void;exchange?:()=>Promise<void>|void;afterDispatch?:()=>void;verify?:()=>void}={};
 type Transaction={mode:'read'|'write';draft:AttestationModelState;saved:boolean};const transactions=new WeakMap<object,Transaction>();
 const deps:AttestationModelDependencies={qualification:'synthetic_attestation_persistence_v1',
  transaction:async(mode,work)=>{let release=()=>{};if(mode==='write'){const prior=tail;tail=new Promise<void>(r=>release=r);await prior;}
   try{if(mode==='write'){writes++;hooks.beforeWrite?.(writes);}const db={} as any,tx:Transaction={mode,draft:copy(state),saved:false};transactions.set(db,tx);
    const result=await work(db);if(tx.saved){state=copy(tx.draft);if(fault?.point==='commit_ack'&&state.journal.at(-1)?.writer===fault.writer){fault=null;throw new AttestationCommitUnknown();}
     if(state.journal.at(-1)?.writer==='dispatch'){release();release=()=>{};hooks.afterDispatch?.();}}return result;
   }finally{release();}},
  bound:async db=>{const tx=transactions.get(db)!;return {mode:tx.mode,isolation:tx.mode==='read'?'repeatable read':'serializable',readOnly:tx.mode==='read',fenceLocked:tx.mode==='write',origin:true};},
  load:async db=>copy(transactions.get(db)!.draft),
  save:async(db,next)=>{const tx=transactions.get(db)!;assert.equal(tx.mode,'write');const writer=next.journal.at(-1)!.writer;
   if(fault?.writer===writer&&fault.point!=='commit_ack'){
    // Explicit partial transaction drafts; the outer rollback discards all of them.
    tx.draft.canonical=copy(next.canonical);tx.draft.attestations=copy(next.attestations);tx.draft.seals=copy(next.seals);
    if(fault.point!=='state')tx.draft.journal=copy(next.journal);if(['audit','fence'].includes(fault.point))tx.draft.receipts=copy(next.receipts);
    if(fault.point==='fence')tx.draft.fence=next.fence;throw Error('synthetic rollback');
   }tx.draft=copy(inspectAttestationState(next,f.now()));tx.saved=true;},
  signer:{qualification:'synthetic_attestation_signer_v1',keyId:first.keyId,sign:async(db,e)=>{
   assert.equal(transactions.get(db)!.mode,'write');assert.ok(Object.isFrozen(e)&&Object.isFrozen(e.payload)&&Object.isFrozen(e.publicKey));signatures++;
   return digest('synthetic-signature-not-cryptography',{payloadDigest:e.payloadDigest,publicKey:e.publicKey.material}).repeat(2);}},
  verifier:{qualification:'synthetic_attestation_verifier_v1',verify:async(db,e)=>{
   assert.ok(transactions.has(db));assert.ok(Object.isFrozen(e));verifications++;hooks.verify?.();
   return e.signature===digest('synthetic-signature-not-cryptography',{payloadDigest:e.payloadDigest,publicKey:e.publicKey.material}).repeat(2);}},
  exchange:async(db,s)=>{assert.equal(transactions.get(db)!.mode,'write');assert.ok(Object.isFrozen(s));exchanges++;await hooks.exchange?.();}
 };
 const model=createAttestationPersistenceModel(deps,f.now),input=()=>({decisionId:b.decisionId,ticketId:b.ticketId});
 const source=(writer:typeof attestationWriters[number],mutate?:(c:AttestationModelState['canonical'])=>void)=>{const c=copy(state.canonical);mutate?.(c);state=recordAttestationSourceWrite(state,writer,c,f.now());};
 const key=(action:string,keyId:string,m:any=null,starts:string|null=null,cutover:string|null=null)=>state=recordAttestationKeyWrite(state,{id:randomUUID(),action,keyId,material:m,overlapStartsAt:starts,cutoverAt:cutover},f.now());
 return {model,deps,hooks,material,first,key,source,b,iso:f.iso,now:f.now,advance:f.advance,input,
  attest:()=>model.attest({...input(),expected:attestationSourceVersion(state)}),state:()=>copy(state),tamper:(fn:(s:any)=>void)=>fn(state),
  fault:(v:typeof fault)=>fault=v,counts:()=>({writes,exchanges,signatures,verifications})};
}
test('source-only server decision attestation persistence proposal',async t=>{
 let effects=0;const forbid=()=>{effects++;throw Error('external effect forbidden');};
 for(const m of ['connect','createConnection'] as const)t.mock.method(net,m,forbid);t.mock.method(net.Server.prototype,'listen',forbid);t.mock.method(tls,'connect',forbid);
 for(const module of [http,https])for(const m of ['request','get'] as const)t.mock.method(module,m,forbid);
 for(const m of ['lookup','resolve','resolve4','resolve6'] as const){t.mock.method(dns,m,forbid);t.mock.method(dns.promises,m,forbid);}
 t.mock.method(globalThis,'fetch',forbid);for(const m of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'] as const)t.mock.method(childProcess,m,forbid);
 for(const m of ['generateKeyPair','generateKeyPairSync','createPrivateKey','sign'] as const)t.mock.method(crypto,m,forbid);
 const logs:unknown[]=[];for(const m of ['log','warn','error'] as const)t.mock.method(console,m,(...v:unknown[])=>logs.push(v));
 await t.test('current session-owner attestation, both purposes, canonical anchors and one-attempt completion',async()=>{
  for(const purpose of ['first_enrollment','owner_recovery'] as const){const f=fixture(purpose),before=f.state();assert.equal((await f.attest()).ok,true);
   const s=f.state(),p=s.attestations[0].payload;assert.equal(p.ownerAuthLevel,'roost_session');assert.equal(p.authorityRevision,before.canonical.authorityRevision+1);
   assert.equal(p.ownerAuthEvidenceDigest,digest('owner-decision-auth-evidence-v1',s.canonical.auth));assert.equal((await f.model.run(f.input())).ok,true);
   assert.equal(f.state().seals[0].state,'completed');assert.equal(f.counts().exchanges,1);assert.equal((await f.model.run(f.input())).ok,false);assert.equal(f.counts().exchanges,1);
   const result=await f.model.status(f.input());for(const flag of ['implementationReady','executionSupported','pilotReady','liveAdmissionAllowed','pilotExecutionAuthorized','pilotExecutionStarted','transportQualified','launchAuthority'])assert.equal((result as any)[flag],false);
  }
 });
 await t.test('unsigned acceptance and absent signer/verifier never obtain usable authority',async()=>{
  for(const seam of ['signer','verifier'] as const){const f=fixture();f.deps[seam]=undefined;const before=f.state();assert.equal((await f.attest()).ok,false);assert.deepEqual(f.state(),before);assert.equal((await f.model.run(f.input())).ok,false);assert.equal(f.counts().exchanges,0);}
  const f=fixture();assert.equal((await f.model.status(f.input())).ok,false);assert.equal((await f.model.run(f.input())).ok,false);
  assert.equal((await createAttestationPersistenceModel().attest({...f.input(),expected:attestationSourceVersion(f.state())})).ok,false);
 });
 await t.test('owner transfer, ambiguity, unauthenticated or stale owner evidence fails closed',async()=>{
  for(const change of [(c:any)=>c.primaryOwnerId=randomUUID(),(c:any)=>c.ownerMembershipIds.push(randomUUID()),(c:any)=>c.candidateCount=2,
   (c:any)=>c.auth=null,(c:any)=>c.auth.ownerId=randomUUID(),(c:any)=>c.auth.acceptanceId=randomUUID(),(c:any)=>c.auth.authTime='2029-12-31T23:00:00.000Z',
   (c:any)=>c.auth.policyRevision++,(c:any)=>c.acceptance.revision++]){const f=fixture();f.source('owner_membership',change);assert.equal((await f.attest()).ok,false);assert.equal(f.counts().exchanges,0);}
  const f=fixture();await f.attest();f.source('owner_membership',c=>c.primaryOwnerId=randomUUID());assert.equal((await f.model.run(f.input())).ok,false);
 });
 await t.test('all intent/ticket/lifecycle/issuer/channel/policy bindings invalidate the prior attestation',async()=>{
  for(const field of ['intentDigest','evidenceDigest','ticketContentDigest','ticketEnvelopeDigest','hostGeneration','installationGeneration','issuerRevision','channelGrantDigest','policyRevision']){
   const f=fixture();await f.attest();f.source('intent_evidence',(c:any)=>{c.ceremony[field]=typeof c.ceremony[field]==='number'?2:field.endsWith('Generation')?randomUUID():hash('0');});
   assert.equal((await f.model.run(f.input())).ok,false,field);assert.equal(f.counts().exchanges,0);}
 });
 await t.test('terminal supersede/revoke/expire/reject history cannot revive old attestations',async()=>{
  for(const action of ['supersede','revoke','expire','reject'] as const){const f=fixture();await f.attest();if(action==='expire')f.advance(60000);f.source(action);
   assert.equal((await f.model.run(f.input())).ok,false);assert.equal(f.counts().exchanges,0);assert.throws(()=>f.source('accept',c=>c.status='accepted'));}
 });
 await t.test('create/adopt provenance, immutable purpose, monotone epoch/high-water and legacy deny',async()=>{
  const adopted=fixture('first_enrollment',true);assert.equal((await adopted.attest()).ok,true);
  for(const mutate of [(m:any)=>m.epoch=1,(m:any)=>m.purpose='worker-bootstrap-owner-ticket-v1',(m:any)=>delete m.provenance,
   (m:any)=>m.provenance.installationId=randomUUID(),(m:any)=>m.publicKeyDigest=hash('0')]){const f=fixture(),m=f.material(2),before=f.state();mutate(m);
   assert.throws(()=>f.key('stage',m.keyId,m,f.iso(1000),f.iso(2000)));assert.deepEqual(f.state(),before);}
  const f=fixture();f.tamper(s=>s.keys=[]);assert.equal((await f.attest()).ok,false);
 });
 await t.test('bounded overlap allows only scheduled public generations; cutover/retire/revoke are terminal',async()=>{
  const f=fixture();await f.attest();const m=f.material(2);f.key('stage',m.keyId,m,f.iso(1000),f.iso(3000));
  const keys=()=>projectAttestationKeys(f.state().keys,f.b.binding.workspaceId,f.b.binding.installationId,f.now());
  assert.equal(keys().highWater,2);assert.deepEqual(keys().usable.map(k=>k.material.epoch),[1]);assert.equal((await f.model.status(f.input())).ok,true);
  f.advance(1000);assert.deepEqual(keys().usable.map(k=>k.material.epoch),[1,2]);assert.equal((await f.model.status(f.input())).ok,true);
  assert.throws(()=>f.key('cutover',m.keyId));f.advance(2000);assert.deepEqual(keys().usable,[]);assert.equal((await f.model.status(f.input())).ok,false);
  f.key('cutover',m.keyId);assert.deepEqual(keys().usable.map(k=>k.material.epoch),[2]);f.key('retire',f.first.keyId);assert.equal(keys().keys[0].state,'retired');
  assert.equal((await f.model.run(f.input())).ok,false);f.key('revoke',m.keyId);assert.deepEqual(keys().usable,[]);assert.equal(keys().highWater,2);assert.throws(()=>f.key('cutover',m.keyId));
  const g=fixture(),tooLong=g.material(2);assert.throws(()=>g.key('stage',tooLong.keyId,tooLong,g.iso(1000),g.iso(122000)));
 });
 await t.test('staged signer not yet valid, revoked key and key expiry deny',async()=>{
  const f=fixture(),m=f.material(2);f.key('stage',m.keyId,m,f.iso(1000),f.iso(3000));f.deps.signer!.keyId=m.keyId;
  assert.equal((await f.attest()).ok,false);f.advance(1000);assert.equal((await f.attest()).ok,true);f.advance(2000);f.key('cutover',m.keyId);
  assert.equal((await f.model.status(f.input())).ok,true);f.key('revoke',m.keyId);assert.equal((await f.model.run(f.input())).ok,false);
  const g=fixture();g.key('revoke',g.first.keyId);assert.equal((await g.attest()).ok,false);assert.equal(g.counts().signatures,0);
  const h=fixture();h.advance(240000);assert.deepEqual(projectAttestationKeys(h.state().keys,h.b.binding.workspaceId,h.b.binding.installationId,h.now()).usable,[]);
  assert.equal((await h.attest()).ok,false);assert.equal(h.counts().signatures,0);
 });
 await t.test('twenty concurrent attest/revise/revoke operations share a serialized mock fence',async()=>{
  for(const terminalFirst of [true,false]){const f=fixture(),expected=attestationSourceVersion(f.state());
   const mutate=async(writer:'revise'|'revoke')=>f.deps.transaction('write',async db=>{
    const s=inspectAttestationState(await f.deps.load(db),f.now()),c=copy(s.canonical);if(writer==='revise'){c.ceremony.decisionRevision++;c.status='proposed';c.acceptance=null;c.auth=null;}
    await f.deps.save(db,recordAttestationSourceWrite(s,writer,c,f.now()));});
   const operations:Promise<unknown>[]=[];if(terminalFirst)operations.push(mutate('revoke'));
   for(let i=0;i<20;i++)operations.push(i%5===4?mutate('revise'):f.model.attest({...f.input(),expected}));if(!terminalFirst)operations.push(mutate('revoke'));
   await Promise.allSettled(operations);const s=f.state();assert.equal(s.canonical.status,'revoked');assert.ok(s.attestations.length<=1);assert.equal(f.counts().signatures,terminalFirst?0:1);
   assert.equal((await f.model.run(f.input())).ok,false);assert.equal(f.counts().exchanges,0);inspectAttestationState(s,f.now());
  }
 });
 await t.test('twenty concurrent ceremonies permit one start/dispatch/exchange only',async()=>{
  const f=fixture();await f.attest();const results=await Promise.all(Array.from({length:20},()=>f.model.run(f.input())));
  assert.equal(results.filter(r=>r.ok).length,1);assert.equal(f.state().seals.length,1);assert.equal(f.counts().exchanges,1);
 });
 await t.test('CAS closes changes after last read and between start and dispatch; zero exchange',async()=>{
  for(const n of [2,3]){const f=fixture();await f.attest();f.hooks.beforeWrite=count=>{if(count===n)f.source('revise',c=>{c.ceremony.intentDigest=hash('0');});};
   const r=await f.model.run(f.input());assert.equal(r.ok,false);assert.equal(f.counts().exchanges,0);assert.equal(f.state().seals.length,n===2?0:1);
   assert.equal((await f.model.run(f.input())).ok,false);assert.equal(f.counts().exchanges,0);}
 });
 await t.test('rollback restores state/history/audit/fence for attest and ceremony writes',async()=>{
  for(const writer of ['attest','ceremony_start','dispatch','complete'])for(const point of ['state','history','audit','fence'] as const){const f=fixture();
   if(writer!=='attest')await f.attest();const before=f.state();f.fault({writer,point});const r=writer==='attest'?await f.attest():await f.model.run(f.input());assert.equal(r.ok,false);
   const s=f.state();assert.equal(s.journal.filter(j=>j.writer===writer).length,0);inspectAttestationState(s,f.now());
   if(writer==='attest'||writer==='ceremony_start')assert.deepEqual(s,before);else assert.equal(s.seals[0].state,writer==='dispatch'?'started':'dispatched');
   assert.equal(f.counts().exchanges,writer==='complete'?1:0);
  }
 });
 await t.test('shared fence stays held through send; twenty waiting revokers cannot overtake dispatch',async()=>{
  const f=fixture();await f.attest();let entered!:()=>void,release!:()=>void;
  const sending=new Promise<void>(r=>entered=r),gate=new Promise<void>(r=>release=r);
  f.hooks.exchange=async()=>{entered();await gate;};const run=f.model.run(f.input());await sending;
  const writers=Promise.allSettled(Array.from({length:20},()=>f.deps.transaction('write',async db=>{
   const s=inspectAttestationState(await f.deps.load(db),f.now());await f.deps.save(db,recordAttestationSourceWrite(s,'revoke',s.canonical,f.now()));
  })));
  assert.equal(f.state().canonical.status,'accepted');assert.equal(f.state().seals[0].state,'started');release();
  const [result,mutations]=await Promise.all([run,writers]);assert.equal(mutations.filter(r=>r.status==='fulfilled').length,1);
  assert.equal('error'in result&&result.error,'delivery_unknown');assert.equal(f.state().canonical.status,'revoked');assert.equal(f.counts().exchanges,1);
  assert.equal((await f.model.run(f.input())).ok,false);assert.equal(f.counts().exchanges,1);
 });
 await t.test('lost commit acknowledgements are unknown and sealed attempts never retry exchange',async()=>{
  for(const writer of ['attest','ceremony_start','dispatch','complete']){const f=fixture();if(writer!=='attest')await f.attest();f.fault({writer,point:'commit_ack'});
   const r=writer==='attest'?await f.attest():await f.model.run(f.input());assert.equal(r.ok,false);assert.equal('error'in r&&r.error,writer==='attest'?'reconciliation_required':'delivery_unknown');
   const exchanges=f.counts().exchanges;if(writer==='attest')assert.equal((await f.attest()).ok,false);else assert.equal((await f.model.run(f.input())).ok,false);
   assert.equal(f.counts().exchanges,exchanges);assert.equal(exchanges,['dispatch','complete'].includes(writer)?1:0);}
 });
 await t.test('revocation after dispatch or failed completion readback is unknown with no retry',async()=>{
  for(const mode of ['revoke','expiry','readback','exchange']){const f=fixture();await f.attest();f.hooks.afterDispatch=()=>{
   if(mode==='revoke')f.source('revoke');if(mode==='expiry')f.advance(60000);if(mode==='readback')f.deps.load=async()=>{throw Error('unavailable');};};
   if(mode==='exchange')f.hooks.exchange=()=>{throw Error('lost response');};
   const r=await f.model.run(f.input());assert.equal('error'in r&&r.error,'delivery_unknown');assert.equal('reconciliationRequired'in r&&r.reconciliationRequired,true);assert.equal(r.retryable,false);
   assert.equal(f.state().seals[0].state,mode==='exchange'?'started':'dispatched');assert.equal((await f.model.run(f.input())).ok,false);assert.equal(f.counts().exchanges,1);}
 });
 await t.test('every writer including interview/direct SQL requires exact guard and atomic receipt',async()=>{
  const interview=fixture('first_enrollment',false,true);assert.equal((await interview.attest()).ok,true);
  for(let i=0;i<attestationWriters.length;i++)for(const field of ['missing','enabled','binding','definition','configuration']){const f=fixture();
   f.tamper(s=>{if(field==='missing')s.guards.splice(i,1);else s.guards[i][field]=field==='enabled'?false:'other';});assert.equal((await f.attest()).ok,false);assert.equal(f.counts().signatures,0);}
  for(const mutate of [(s:any)=>s.origin=false,(s:any)=>s.receipts.pop(),(s:any)=>s.journal.pop(),(s:any)=>s.fence++,
   (s:any)=>s.receipts[0].eventDigest=hash('0'),(s:any)=>s.canonical.ceremony.intentDigest=hash('0'),(s:any)=>s.keys[0].material.epoch++]){
   const f=fixture();f.tamper(mutate);assert.equal((await f.attest()).ok,false);assert.equal(f.counts().signatures,0);}
 });
 await t.test('read purity, strict request overrides, signature tampering and bound transaction required',async()=>{
  const f=fixture();await f.attest();const before=f.state();assert.equal((await f.model.status(f.input())).ok,true);assert.deepEqual(f.state(),before);
  for(const key of ['signature','signer','verifier','auth','ownerId','keyId','target','model','profile','url','force','authorityRevision','fence']){
   const input={...f.input(),[key]:'override'};assert.equal((await f.model.status(input)).ok,false);assert.equal((await f.model.run(input)).ok,false);}
  assert.deepEqual(f.state(),before);assert.equal(f.counts().exchanges,0);
  const g=fixture();g.deps.signer!.sign=async()=>hash('0').repeat(2);assert.equal((await g.attest()).ok,false);assert.equal(g.state().attestations.length,0);
  const h=fixture();h.deps.bound=async()=>({mode:'write',isolation:'serializable',readOnly:false,fenceLocked:false,origin:true});assert.equal((await h.attest()).ok,false);
  const expired=fixture(),snapshot=expired.state();expired.hooks.verify=()=>expired.advance(60000);assert.equal((await expired.attest()).ok,false);assert.deepEqual(expired.state(),snapshot);
 });
 assert.equal(effects,0);assert.deepEqual(logs,[]);
});
