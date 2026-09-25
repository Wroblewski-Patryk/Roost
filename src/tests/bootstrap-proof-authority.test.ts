import test from 'node:test';
import assert from 'node:assert/strict';
import crypto,{createHash} from 'node:crypto';
import net from 'node:net';import tls from 'node:tls';import http from 'node:http';import https from 'node:https';import dns from 'node:dns';import childProcess from 'node:child_process';
import {proofBytes,proofDigest} from '../modules/api-keys/bootstrap-proof-encoding';
import {proofKeyIntent,proofEventReceipt,replayProofKeys,proofReference,selectProofKey,type ProofKeyEvent,type ProofKeyIntent} from '../modules/api-keys/bootstrap-proof-key-contract';
import {proofAuthorityAttachment,validateProofAuthority,proofSigningBytes,proofDomains,checkProofBoundary,type ProofAuthorityAttachment,type ProofAuthoritySnapshot,type MockProofAuthorityPorts,type ProofKind} from '../modules/api-keys/bootstrap-proof-authority-contract';
import {canonicalCompletionFixture} from './bootstrap-canonical-completion-fixture';
import {createCanonicalCompletionPublicVerifier} from '../modules/api-keys/bootstrap-canonical-completion-verifier';
import {lifecycleFlags} from '../modules/api-keys/bootstrap-ticket-lifecycle-contract';

// Fixed public Ed25519 points already used by bootstrap-issuer.test.ts (RFC8032
// public points). No signature vector or private/seed material is used here.
const points=['d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a','3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c','fc51cd8e6218a1a38da47ed00230f0580816ed13ba3303ac5deb911548908025'];
const materials=points.map((p,i)=>{const b=Buffer.from('302a300506032b6570032100'+p,'hex');return {keyId:`proof-public-${i}`,algorithm:'Ed25519' as const,format:'spki-der-base64' as const,spki:b.toString('base64'),publicKeyDigest:createHash('sha256').update(b).digest('hex')};});
let counter=1;const id=()=>`00000000-0000-4000-8000-${String(counter++).padStart(12,'0')}`,hash=(s='a')=>s.repeat(64),clone=<T>(v:T):T=>structuredClone(v);
const at=(value:string,offset:number)=>new Date(Date.parse(value)+offset).toISOString();
function append(history:ProofKeyEvent[],intent:ProofKeyIntent,time:string){
 const old=history.length?replayProofKeys(history):null;
 const body={id:id(),previousDigest:old?.historyDigest??null,revision:intent.expectedRevision+1,at:time,intent:proofKeyIntent.parse(intent),
  ownerId:id(),decisionId:id(),decisionRevision:1,decisionIntentDigest:proofDigest(intent),fromFence:history.length,toFence:history.length+1,auditId:id()};
 const event={...body,receiptDigest:proofEventReceipt(body)};replayProofKeys([...history,event]);history.push(event);return event;
}
function change(history:ProofKeyEvent[],action:ProofKeyIntent['action'],time:string,overrides:Partial<ProofKeyIntent>={}){
 const old=replayProofKeys(history);
 return append(history,{version:'bootstrap-proof-key-history-v1',scope:old.scope,action,expectedRevision:old.revision,targetEpoch:old.highWater,
  material:null,generation:null,provenance:null,adoptionEvidenceDigest:null,activatesAt:null,cutoverAt:null,expiresAt:at(time,600000),...overrides},time);
}
async function fixture(){
 const f=await canonicalCompletionFixture(),b=f.input.binding.payload,c=b.command,time=b.issuedAt,
 generation={installationGeneration:b.installationGeneration,hostId:c.binding.hostId,hostGeneration:b.hostGeneration};
 assert.ok(c.ownerId);
 const worker:ProofKeyEvent[]=[],server:ProofKeyEvent[]=[];
 for(const [history,scope,material,gen,source] of [
  [worker,{principal:'local_worker',purpose:'worker-bootstrap-proof-v1',workspaceId:c.binding.workspaceId,installationId:c.binding.installationId},materials[0],generation,'local_worker_os_protected'],
  [server,{principal:'roost_server',purpose:'bootstrap-completion-binding-attestation-v1',workspaceId:c.binding.workspaceId},materials[2],null,'roost_server_secret_store']
 ] as const)append(history,{version:'bootstrap-proof-key-history-v1',scope,action:'create',expectedRevision:0,targetEpoch:1,material,generation:gen,
  provenance:{source,evidenceDigest:hash()},adoptionEvidenceDigest:null,activatesAt:null,cutoverAt:null,expiresAt:at(time,600000)},at(time,-60000));
 const a:ProofAuthorityAttachment={version:'bootstrap-proof-authority-v1',workspaceId:c.binding.workspaceId,installationId:c.binding.installationId,generation,ownerId:c.ownerId,
  decisionId:c.decisionId,decisionRevision:1,ticketId:c.ticketId,requestId:b.requestId,enrollmentGeneration:1,purpose:'first_enrollment',
  worker:proofReference(replayProofKeys(worker),1),server:proofReference(replayProofKeys(server),1),prior:null};
 const s:ProofAuthoritySnapshot={at:b.completedAt,fence:1,sourceDigest:hash(),workspaceId:a.workspaceId,installationId:a.installationId,generation,
  hostEnabled:true,installationEnabled:true,currentOwnerId:a.ownerId,enrollmentGeneration:1,credentialHighWater:0,workerHistory:worker,serverHistory:server,reservedPublicKeyDigests:[hash('b')],
  decision:{id:a.decisionId,ownerId:a.ownerId,revision:1,state:'accepted',superseded:false,attachmentDigest:proofDigest(a),acceptedAt:at(time,-1000),expiresAt:at(time,60000)},
  ticket:{id:a.ticketId,decisionId:a.decisionId,decisionRevision:1,ownerId:a.ownerId,requestId:a.requestId,attachmentDigest:proofDigest(a),envelopeDigest:b.ticketEnvelopeDigest,
   issuedAt:at(time,-500),sealedAt:time,expiresAt:at(time,60000),revoked:false},prior:null,writerInventory:'source_only_all_writers_contract_v1'};
 const context={authorizationDigest:proofDigest(a),ticketId:a.ticketId,ticketEnvelopeDigest:b.ticketEnvelopeDigest,requestId:a.requestId,attemptId:c.attemptId,
  sealDigest:b.sealDigest,dispatchPredecessorDigest:proofDigest(b.dispatchPredecessor),installationGeneration:b.installationGeneration,hostGeneration:b.hostGeneration};
 return {a,s,input:f.input,context};
}
type Fixture=Awaited<ReturnType<typeof fixture>>;
function reseal(f:Fixture){f.s.decision.attachmentDigest=f.s.ticket.attachmentDigest=f.context.authorizationDigest=proofDigest(f.a);}
function recovery(base:Fixture){
 const f=clone(base),h=f.s.workerHistory,time=f.s.ticket.issuedAt;
 f.a.prior={worker:clone(f.a.worker),decisionId:id(),ticketId:id(),requestId:id(),enrollmentGeneration:1};
 change(h,'revoke',at(time,-30000));
 change(h,'stage',at(time,-20000),{targetEpoch:2,material:materials[1],generation:f.a.generation,provenance:{source:'local_worker_os_protected',evidenceDigest:hash('c')},activatesAt:at(time,-19000),cutoverAt:at(time,-10000)});
 change(h,'cutover',at(time,-10000));f.a.worker=proofReference(replayProofKeys(h),2);
 f.a.purpose='owner_recovery';f.a.enrollmentGeneration=f.s.enrollmentGeneration=2;f.s.credentialHighWater=1;
 f.s.prior={...clone(f.a.prior),terminal:true,credentialRevoked:true};reseal(f);return f;
}
function ports(f:Fixture,mutate?:()=>void){
 const calls:{db:unknown;kind:string;value?:unknown}[]=[];
 const p:MockProofAuthorityPorts={qualification:'source_only_mock_proof_ports_v1',read:async db=>{calls.push({db,kind:'read'});return clone(f.s);},
  verify:async(db,r)=>{calls.push({db,kind:'verify',value:r});mutate?.();return true;}};
 return {p,calls};
}
const request=(f:Fixture,kind:ProofKind='peer')=>({kind,payload:f.input[kind].payload,context:f.context,signature:'0'.repeat(128)});

test('source-only approved bootstrap proof authority contract',async t=>{
 let effects=0;const forbidden=()=>{effects++;throw Error('forbidden external/private operation');};
 for(const m of ['generateKeyPair','generateKeyPairSync','createPrivateKey','sign','verify'] as const)t.mock.method(crypto,m,forbidden);
 for(const m of ['connect','createConnection'] as const)t.mock.method(net,m,forbidden);t.mock.method(net.Server.prototype,'listen',forbidden);t.mock.method(tls,'connect',forbidden);
 for(const mod of [http,https])for(const m of ['request','get'] as const)t.mock.method(mod,m,forbidden);
 for(const m of ['lookup','resolve','resolve4','resolve6'] as const){t.mock.method(dns,m,forbidden);t.mock.method(dns.promises,m,forbidden);}
 t.mock.method(globalThis,'fetch',forbidden);for(const m of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'] as const)t.mock.method(childProcess,m,forbidden);
 const logs:unknown[]=[];for(const m of ['log','warn','error'] as const)t.mock.method(console,m,(...args:unknown[])=>logs.push(args));
 const baseline=await fixture(),db={} as any;
 await t.test('first enrollment: separate principals on one bound Db; pure reads and flags false',async()=>{
  for(const kind of ['peer','completion','binding'] as const){
   const f=clone(baseline),before=clone(f),{p,calls}=ports(f),result=await checkProofBoundary(db,f.a,request(f,kind),p,'before_send');
   assert.equal(result.modelAccepted,true);for(const flag of Object.keys(lifecycleFlags))assert.equal((result as any)[flag],false);
   assert.deepEqual(calls.map(c=>c.kind),['read','verify','read']);assert.ok(calls.every(c=>c.db===db));assert.deepEqual(f,before);
   const verification=calls[1].value as any;assert.equal(verification.principal,kind==='binding'?'roost_server':'local_worker');assert.equal(verification.purpose,kind==='binding'?'bootstrap-completion-binding-attestation-v1':'worker-bootstrap-proof-v1');
  }
 });
 await t.test('recovery: fresh key epoch and explicit fresh decision/ticket/request/generation',()=>{
  const f=recovery(baseline);assert.doesNotThrow(()=>validateProofAuthority(f.a,f.s));
  for(const field of ['decisionId','ticketId','requestId'] as const){const g=clone(f);g.a[field]=g.a.prior![field];reseal(g);assert.throws(()=>validateProofAuthority(g.a,g.s));}
  const reused=clone(f);reused.a.worker=proofReference(replayProofKeys(reused.s.workerHistory),1);reseal(reused);assert.throws(()=>validateProofAuthority(reused.a,reused.s));
  const forged=clone(f);forged.a.prior!.worker.historyDigest=hash('f');forged.s.prior!.worker.historyDigest=hash('f');reseal(forged);assert.throws(()=>validateProofAuthority(forged.a,forged.s));
 });
 await t.test('create/adopt provenance, no retrospective adoption or legacy empty history',()=>{
  assert.throws(()=>replayProofKeys([]));const f=clone(baseline),h:ProofKeyEvent[]=[];
  append(h,{...f.s.workerHistory[0].intent,action:'adopt',targetEpoch:7,adoptionEvidenceDigest:hash('d')},f.s.workerHistory[0].at);
  const state=replayProofKeys(h);assert.equal(state.highWater,7);
  assert.throws(()=>selectProofKey(h,proofReference(state,7),at(h[0].at,-1),f.s.at,f.a.generation));
  assert.throws(()=>proofKeyIntent.parse({...h[0].intent,provenance:{source:'roost_server_secret_store',evidenceDigest:hash()}}));
  assert.throws(()=>proofKeyIntent.parse({...h[0].intent,privateKey:'forbidden-field'}));
 });
 await t.test('stage, bounded overlap, hard cutover, explicit cutover and retire; no silent reader mutation',()=>{
  const f=clone(baseline),h=f.s.workerHistory,time=f.s.ticket.issuedAt,start=at(time,-300),end=at(time,100);
  change(h,'stage',at(time,-400),{targetEpoch:2,material:materials[1],generation:f.a.generation,provenance:{source:'local_worker_os_protected',evidenceDigest:hash()},activatesAt:start,cutoverAt:end});
  const state=replayProofKeys(h),old=proofReference(state,1),next=proofReference(state,2),before=clone(h);
  for(const ref of [old,next])assert.doesNotThrow(()=>selectProofKey(h,ref,start,time,f.a.generation));
  for(const ref of [old,next])assert.throws(()=>selectProofKey(h,ref,start,end,f.a.generation));assert.deepEqual(h,before);
  change(h,'cutover',end);const current=replayProofKeys(h);assert.equal(current.generations[0].state,'retired');
  assert.doesNotThrow(()=>selectProofKey(h,proofReference(current,2),start,end,f.a.generation));assert.throws(()=>selectProofKey(h,next,start,end,f.a.generation));
  const retired=clone(before);change(retired,'retire',end,{targetEpoch:1});assert.equal(replayProofKeys(retired).generations[0].state,'retired');
  assert.throws(()=>change(clone(baseline.s.workerHistory),'stage',time,{targetEpoch:2,material:materials[1],generation:f.a.generation,provenance:{source:'local_worker_os_protected',evidenceDigest:hash()},activatesAt:time,cutoverAt:at(time,300001)}));
 });
 await t.test('terminal revoke, monotonic high-water, replay/ABA and malformed receipt denial',()=>{
  const f=clone(baseline),h=f.s.workerHistory,time=f.s.at;change(h,'revoke',time);
  assert.equal(replayProofKeys(h).highWater,1);assert.throws(()=>change(h,'revoke',time));
  assert.throws(()=>change(h,'stage',time,{targetEpoch:1,material:materials[1],generation:f.a.generation,provenance:{source:'local_worker_os_protected',evidenceDigest:hash()},activatesAt:time,cutoverAt:at(time,1000)}));
  assert.throws(()=>change(h,'stage',time,{targetEpoch:2,material:materials[0],generation:f.a.generation,provenance:{source:'local_worker_os_protected',evidenceDigest:hash()},activatesAt:time,cutoverAt:at(time,1000)}));
  const invalid=clone(h);invalid[1].receiptDigest=hash('f');assert.throws(()=>replayProofKeys(invalid));assert.throws(()=>replayProofKeys([...h,h[1]]));
 });
 await t.test('server lifecycle is distinct; revoked staged epochs stay burned and cannot extend old deadlines',()=>{
  const f=clone(baseline),h=f.s.serverHistory,time=f.s.ticket.issuedAt,end=at(time,1000);
  change(h,'stage',time,{targetEpoch:2,material:materials[1],provenance:{source:'roost_server_secret_store',evidenceDigest:hash()},activatesAt:time,cutoverAt:end});
  change(h,'revoke',time,{targetEpoch:2});const state=replayProofKeys(h);assert.equal(state.highWater,2);
  assert.throws(()=>selectProofKey(h,proofReference(state,1),time,end,null));assert.throws(()=>selectProofKey(h,proofReference(state,2),time,time,null));
  change(h,'stage',time,{targetEpoch:3,material:materials[0],provenance:{source:'roost_server_secret_store',evidenceDigest:hash()},activatesAt:time,cutoverAt:at(end,1000)});
  assert.equal(replayProofKeys(h).highWater,3);assert.equal(replayProofKeys(h).generations[0].validUntil,end);
 });
 await t.test('owner/ticket/lifecycle mismatch and unavailable writer inventory deny',()=>{
  const mutations:((f:Fixture)=>void)[]=[f=>f.s.currentOwnerId=id(),f=>f.s.decision.revision++,f=>f.s.decision.attachmentDigest=hash('f'),f=>f.s.ticket.attachmentDigest=hash('f'),
   f=>f.s.ticket.decisionId=id(),f=>f.s.ticket.revoked=true as any,f=>f.s.generation.hostGeneration=id(),f=>f.s.generation.installationGeneration=id(),f=>f.s.generation.hostId=id(),
   f=>f.s.workspaceId=id(),f=>f.s.installationId=id(),f=>f.s.hostEnabled=false as any,f=>f.s.installationEnabled=false as any,f=>f.s.writerInventory='legacy' as any,
   f=>f.s.ticket.issuedAt=at(f.s.decision.acceptedAt,-1),f=>f.s.ticket.sealedAt=at(f.s.ticket.issuedAt,-1),f=>f.s.at=f.s.ticket.expiresAt,
   f=>f.s.decision.superseded=true as any,f=>f.s.workerHistory=[],f=>f.s.credentialHighWater=1];
  for(const mutate of mutations){const f=clone(baseline);mutate(f);assert.throws(()=>validateProofAuthority(f.a,f.s));}
 });
 await t.test('ticket/owner-key purpose or public-material reuse, worker/server exchange and stale head deny',()=>{
  for(const purpose of ['worker-bootstrap-owner-ticket-v1','owner-decision-attestation-v1','bootstrap-current-owner-decision-v1']){
   const f=clone(baseline);(f.a.worker.scope as any).purpose=purpose;assert.throws(()=>proofAuthorityAttachment.parse(f.a));
  }
  const f=clone(baseline);[f.a.worker,f.a.server]=[f.a.server,f.a.worker];assert.throws(()=>validateProofAuthority(f.a,f.s));
  const shared=clone(baseline);shared.a.server.publicKeyDigest=shared.a.worker.publicKeyDigest;assert.throws(()=>proofAuthorityAttachment.parse(shared.a));
  for(const role of ['worker','server'] as const){const g=clone(baseline);g.s.reservedPublicKeyDigests.push(g.a[role].publicKeyDigest);assert.throws(()=>validateProofAuthority(g.a,g.s));}
  for(const field of ['epoch','highWater','revision'] as const){const g=clone(baseline);g.a.worker[field]++;reseal(g);assert.throws(()=>validateProofAuthority(g.a,g.s));}
 });
 await t.test('deterministic length framing, object order, Unicode/NUL/JSON coercion rejection',()=>{
  assert.equal(proofBytes({b:[1,true,null],a:'x'}).toString(),'o2:s1:as1:xs1:ba3:i1:1tn');
  assert.deepEqual(proofBytes({a:'x',b:[1,true,null]}),proofBytes({b:[1,true,null],a:'x'}));
  assert.notDeepEqual(proofBytes(['ab','c']),proofBytes(['a','bc']));assert.notDeepEqual(proofBytes([1,2]),proofBytes([2,1]));
  let accessed=0;const getter=Object.defineProperty({},'x',{enumerable:true,get(){accessed++;throw Error('getter executed');}}),hidden=Object.defineProperty([1],'0',{enumerable:false});
  for(const v of ['x\0y','e\u0301','\ud800',undefined,NaN,Infinity,-0,1.5,2n,new Date(),new Array(2),{x:undefined},getter,hidden,Object.create(null)])assert.throws(()=>proofBytes(v));
  assert.equal(accessed,0);
  const cycle:any={};cycle.self=cycle;assert.throws(()=>proofBytes(cycle));assert.throws(()=>proofBytes('x'.repeat(131073)));
 });
 await t.test('separate domains bind entire canonical payload and authority; no legacy fallback',()=>{
  const f=clone(baseline),outputs=[];
  for(const kind of ['peer','completion','binding'] as const){const bytes=proofSigningBytes(kind,f.input[kind].payload,f.a,f.context);assert.ok(bytes.includes(Buffer.from(proofDomains[kind])));outputs.push(bytes.toString('hex'));}
  assert.equal(new Set(outputs).size,3);
  const changed=clone(f.input.peer.payload);changed.pin=hash('f');assert.notDeepEqual(proofSigningBytes('peer',changed,f.a,f.context),proofSigningBytes('peer',f.input.peer.payload,f.a,f.context));
  assert.throws(()=>proofSigningBytes('peer',f.input.peer.payload,{...f.a,version:'legacy'},f.context));
  assert.throws(()=>proofSigningBytes('peer',f.input.peer.payload,f.a,{...f.context,authorizationDigest:hash('f')}));
  assert.throws(()=>proofSigningBytes('binding',f.input.binding.payload,f.a,{...f.context,sealDigest:hash('f')}));
 });
 for(const phase of ['before_send','after_send'] as const)await t.test(`${phase}: fresh reread denies drift/revoke/cutover with no retry`,async()=>{
  for(const changeSource of [(f:Fixture)=>f.s.sourceDigest=hash('f'),(f:Fixture)=>f.s.fence++,
   (f:Fixture)=>change(f.s.workerHistory,'revoke',f.s.at), (f:Fixture)=>f.s.at=f.s.ticket.expiresAt]){
   const f=clone(baseline),{p,calls}=ports(f,()=>changeSource(f)),r=await checkProofBoundary(db,f.a,request(f),p,phase);
   assert.equal(r.modelAccepted,false);assert.equal(r.status,phase==='after_send'?'reconciliation_required':'denied');assert.equal(r.retryable,false);assert.equal(calls.length,3);
  }
 });
 await t.test('clock crosses hard cutover inside verifier; unchanged history still denies on fresh read',async()=>{
  const f=clone(baseline),cutover=at(f.s.at,1000),start=at(f.s.ticket.issuedAt,-2000);
  change(f.s.workerHistory,'stage',start,{targetEpoch:2,material:materials[1],generation:f.a.generation,provenance:{source:'local_worker_os_protected',evidenceDigest:hash()},activatesAt:start,cutoverAt:cutover});
  f.a.worker=proofReference(replayProofKeys(f.s.workerHistory),1);reseal(f);assert.doesNotThrow(()=>validateProofAuthority(f.a,f.s));
  const {p,calls}=ports(f,()=>{f.s.at=cutover;});assert.equal((await checkProofBoundary(db,f.a,request(f),p,'before_send')).modelAccepted,false);assert.equal(calls.length,3);
 });
 for(const action of ['stage','revoke'] as const)await t.test(`twenty readers versus ${action} all deny fresh-history drift on their bound Db`,async()=>{
  const f=clone(baseline);let arrived=0,ready!:()=>void,release!:()=>void;
  const barrier=new Promise<void>(resolve=>ready=resolve),gate=new Promise<void>(resolve=>release=resolve),dbs=Array.from({length:20},()=>({}) as any),seen=new Map<any,number>();
  const p:MockProofAuthorityPorts={qualification:'source_only_mock_proof_ports_v1',read:async db=>{seen.set(db,(seen.get(db)??0)+1);return clone(f.s);},verify:async db=>{assert.equal(seen.get(db),1);if(++arrived===20)ready();await gate;return true;}};
  const runs=dbs.map(db=>checkProofBoundary(db,f.a,request(f),p,'before_send'));
  await barrier;
  try{change(f.s.workerHistory,action,f.s.at,action==='stage'?{targetEpoch:2,material:materials[1],generation:f.a.generation,provenance:{source:'local_worker_os_protected',evidenceDigest:hash()},activatesAt:f.s.at,cutoverAt:at(f.s.at,1000)}:{});}finally{release();}
  const result=await Promise.all(runs);assert.equal(arrived,20);assert.ok(result.every(r=>!r.modelAccepted&&!r.retryable));assert.ok(dbs.every(db=>seen.get(db)===2));
 });
 await t.test('negative verifier, modified transcript, malformed signature and missing/default verifier deny',async()=>{
  for(const behavior of ['false','mutate','throw'] as const){const f=clone(baseline),{p}=ports(f);p.verify=async(_db,r)=>{if(behavior==='throw')throw Error('unavailable');if(behavior==='mutate')r.bytes.fill(0);return behavior!=='false';};
   assert.equal((await checkProofBoundary(db,f.a,request(f),p,'before_send')).modelAccepted,false);}
  for(const signature of ['a'.repeat(126),'A'.repeat(128),'not-a-signature']){const f=clone(baseline),{p,calls}=ports(f);assert.equal((await checkProofBoundary(db,f.a,{...request(f),signature},p,'before_send')).modelAccepted,false);assert.equal(calls.length,0);}
  assert.equal(await createCanonicalCompletionPublicVerifier().verify(db,{} as any),false);
 });
 assert.equal(effects,0);assert.deepEqual(logs,[]);
});
