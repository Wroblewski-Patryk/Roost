import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import net from 'node:net';
import tls from 'node:tls';
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import childProcess from 'node:child_process';
import {proofBytes,proofDigest} from '../modules/api-keys/bootstrap-proof-encoding';
import {reviewDigest} from '../modules/agent-runtime/task-review-contract';
import {proofReference,replayProofKeys} from '../modules/api-keys/bootstrap-proof-key-contract';
import {v3AuthorityVersion,v3Domains,v3Transcript,v3EnvelopeDigest,v3SealDigest,prepareV3Ticket,prepareV3Seal,validateV3Authority,validateV3Plan} from '../modules/api-keys/bootstrap-proof-issuance-contract';
import {createBootstrapProofV3Issuance,v3WritePhases} from '../modules/api-keys/bootstrap-proof-issuance';
import {lifecycleFlags} from '../modules/api-keys/bootstrap-ticket-lifecycle-contract';
import {v3IssuanceFixture,v3AuthorityFixture,changeProof,copy,hash} from './bootstrap-proof-issuance-fixture';
import {proofId,publicMaterials} from './bootstrap-proof-persistence-fixture';

type Fixture=ReturnType<typeof v3AuthorityFixture>;
function refresh(f:Fixture){
 f.authority.intent.proofAuthority=copy(f.authority.attachment);
 const {recordDigest,...snapshot}=f.authority.channel.snapshot;f.authority.channel.snapshot.recordDigest=reviewDigest(snapshot);
 f.authority.owner.intentDigest=proofDigest(f.authority.intent);
 f.authority.attachmentDigest=proofDigest(f.authority.attachment);
 f.command.expected=v3AuthorityVersion(f.authority);
}
function closed(result:any){
 assert.equal(result.sendPermit,false);assert.equal(result.persistenceQualified,false);assert.equal(result.cryptographyQualified,false);
 assert.equal(result.qualification,'source_only_proof_issuance_v3');
 for(const name of Object.keys(lifecycleFlags))assert.equal(result[name],false,name);
}
function denied(result:any,error='bootstrap_proof_v3_seal_unavailable'){
 closed(result);assert.equal(result.ok,false);assert.equal(result.error,error);assert.equal(result.retryable,false);
 if(error==='reconciliation_required')assert.equal(result.issuanceRecorded,null);
}

test('v75 source-only v3 issuance contract and transactional public model',async t=>{
 let effects=0;const forbidden=()=>{effects++;throw Error('forbidden private or external effect');};
 for(const method of ['generateKeyPair','generateKeyPairSync','createPrivateKey','sign','verify'] as const)t.mock.method(crypto,method,forbidden);
 for(const method of ['connect','createConnection'] as const)t.mock.method(net,method,forbidden);
 t.mock.method(net.Server.prototype,'listen',forbidden);t.mock.method(tls,'connect',forbidden);
 for(const module of [http,https])for(const method of ['request','get'] as const)t.mock.method(module,method,forbidden);
 for(const method of ['lookup','resolve','resolve4','resolve6'] as const){t.mock.method(dns,method,forbidden);t.mock.method(dns.promises,method,forbidden);}
 t.mock.method(globalThis,'fetch',forbidden);
 for(const method of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'] as const)t.mock.method(childProcess,method,forbidden);
 const logs:unknown[]=[];for(const method of ['log','warn','error'] as const)t.mock.method(console,method,(...args:unknown[])=>logs.push(args));

 for(const recovery of [false,true])await t.test(`${recovery?'recovery':'first'}: exact graph committed once, independent readback and same writer Db`,async()=>{
  const f=v3IssuanceFixture(recovery),r=await f.api.issue(f.command);closed(r);assert.equal(r.ok,true);
  assert.equal(r.issuanceRecorded,true);assert.equal((r as any).idempotent,false);
  const state=f.state();assert.equal(state.operations.length,1);assert.equal(state.rows.length,14);
  assert.deepEqual([...new Set(state.rows.map(r=>r.phase))],v3WritePhases);
  assert.equal(f.stats.issuer,1);assert.equal(f.stats.sealer,1);
  const writer=f.calls.filter(c=>c.mode==='write');assert.equal(new Set(writer.map(c=>c.db)).size,1);
  assert.equal(new Set(f.calls.map(c=>c.db)).size,3);assert.equal(f.calls.at(-1)?.mode,'read');
  assert.equal(writer.filter(c=>c.kind==='authority').length,10);
  closed(await f.api.beforeSend(f.command));assert.equal((await f.api.beforeSend(f.command) as any).authorityCurrent,true);
  const before=f.state(),counts=copy(f.stats),start=f.calls.length;
  const replay=await f.api.issue(f.command);assert.equal(replay.ok,true);assert.equal((replay as any).idempotent,true);
  assert.deepEqual(f.state(),before);assert.equal(f.stats.writes,counts.writes);assert.equal(f.stats.issuer,counts.issuer);assert.equal(f.stats.sealer,counts.sealer);
  assert.ok(f.calls.slice(start).every(c=>c.mode==='read'));
 });

 await t.test('default and every missing/untrusted dependency deny before any phase',async()=>{
  const f=v3IssuanceFixture();denied(await createBootstrapProofV3Issuance().issue(f.command));
  for(const key of ['ports','authority','issuer','sealer'] as const){
   for(const change of ['missing','qualification',...Object.keys(f.deps[key]).filter(k=>k!=='qualification')]){
    const g=v3IssuanceFixture(),deps:any={...g.deps,[key]:{...g.deps[key]}};
    if(change==='missing')delete deps[key];else deps[key][change]=change==='qualification'?'untrusted':null;
    const api=createBootstrapProofV3Issuance(deps);denied(await api.issue(g.command));denied(await api.inspect(g.command));denied(await api.beforeSend(g.command));assert.equal(g.stats.writes,0);
   }
  }
 });

 await t.test('caller cannot override authority, key, channel, target, signatures or operation shape',async()=>{
  const f=v3IssuanceFixture();
  for(const field of ['authority','issuer','seal','ticketId','attemptId','channel','target','privateKey'])denied(await f.api.issue({...f.command,[field]:'caller override'}));
  for(const value of [null,[],{}, {...f.command,version:'bootstrap-proof-issue-command-v2'}, {...f.command,expected:{...f.command.expected,fence:50}}])denied(await f.api.issue(value));
  for(const key of Object.keys(f.command.expected))denied(await f.api.issue({...f.command,expected:{...f.command.expected,[key]:key==='fence'?'51':hash('f')}}));
  assert.equal(f.stats.writes,0);assert.equal(f.stats.issuer,0);
 });

 await t.test('v72 bytes, strict domains, complete content/envelope/link/seal binding and no legacy fallback',async()=>{
  const f=v3IssuanceFixture();assert.equal((await f.api.issue(f.command)).ok,true);
  const p=f.state().operations[0].plan,prepared=prepareV3Ticket(p.command,p.authority),s=prepareV3Seal(p.command,p.authority,p.envelope),ctx=prepared.payload.context,a=p.authority.attachment;
  assert.equal(prepared.contentBytes,proofBytes(['roost-bootstrap-signing-binary-v1',v3Domains.content,a,ctx,prepared.payload]).toString('hex'));
  assert.equal(p.link.ticketContentDigest,crypto.createHash('sha256').update(Buffer.from(prepared.contentBytes,'hex')).digest('hex'));
  assert.equal(new Set([prepared.contentBytes,prepared.decisionBytes,s.bytes]).size,3);
  assert.equal(p.link.ticketEnvelopeDigest,v3EnvelopeDigest(p.envelope));assert.equal(p.link.sealDigest,v3SealDigest(p.seal));
  assert.equal(ctx.attachmentId,f.command.attachmentId);assert.equal(ctx.attachmentDigest,proofDigest(a));
  for(const role of ['worker','server'] as const)assert.ok(Buffer.from(prepared.contentBytes,'hex').includes(Buffer.from(a[role].historyDigest)));
  const reversed=Object.fromEntries(Object.entries(prepared.payload).reverse());assert.equal(v3Transcript(v3Domains.content,a,ctx,reversed).toString('hex'),prepared.contentBytes);
  for(const version of ['worker-bootstrap-owner-ticket-v1','worker-bootstrap-owner-ticket-v2']){
   const g=copy(p);g.envelope.signed.payload.version=version as any;assert.throws(()=>validateV3Plan(g));
  }
  for(const version of ['worker-bootstrap-admission-v1','worker-bootstrap-admission-v2']){
   const g=copy(p);g.authority.intent.schemaVersion=version as any;assert.throws(()=>validateV3Plan(g));
  }
  assert.throws(()=>v3Transcript('legacy',a,ctx,prepared.payload));
  assert.throws(()=>v3Transcript(v3Domains.decision,a,ctx,prepared.payload));
  assert.throws(()=>v3Transcript(v3Domains.content,a,{...ctx,attachmentId:proofId()},prepared.payload));
  assert.throws(()=>v3Transcript(v3Domains.seal,a,ctx,{...s.payload,state:'consumed'}));
  for(const mutate of [
   (g:typeof p)=>g.link.attachmentId=proofId(),(g:typeof p)=>g.link.attachmentDigest=hash('f'),(g:typeof p)=>g.link.sealDigest=hash('f'),
   (g:typeof p)=>g.link.ticketContentDigest=hash('f'),(g:typeof p)=>g.link.ticketEnvelopeDigest=hash('f'),(g:typeof p)=>g.link.attemptId=proofId(),
   (g:typeof p)=>g.envelope.signed.signature='4'.repeat(128),(g:typeof p)=>g.envelope.decision.signature='4'.repeat(128),
   (g:typeof p)=>g.seal.signature='4'.repeat(128),(g:typeof p)=>g.seal.payload.linkBindingDigest=hash('f'),
   (g:typeof p)=>g.seal.payload.linkBinding.context.sourceFence='51'
  ]){const g=copy(p);mutate(g);assert.throws(()=>validateV3Plan(g));}
 });

 await t.test('owner, decision, lifecycle, issuer, times and exact channel mismatch deny even with refreshed caller digests',()=>{
  const mutations:((f:Fixture)=>void)[]=[
   f=>f.authority.owner.id=proofId(),f=>f.authority.owner.decisionId=proofId(),f=>f.authority.owner.decisionRevision++,
   f=>f.authority.owner.authenticatedAt='2029-12-31T23:54:59.000Z',f=>f.authority.owner.acceptedAt='2030-01-01T00:00:01.000Z',
   f=>f.authority.owner.expiresAt=f.authority.at,f=>f.authority.intent.expiresAt='2030-01-01T00:02:01.000Z',
   f=>f.authority.lifecycle.hostId=proofId(),f=>f.authority.lifecycle.hostGeneration=proofId(),f=>f.authority.lifecycle.installationGeneration=proofId(),
   f=>f.authority.lifecycle.hostEnabled=false as any,f=>f.authority.lifecycle.installationEnabled=false as any,
   f=>f.authority.issuer.material=copy(publicMaterials[0]),f=>{f.authority.issuer.material.keyId=publicMaterials[0].keyId;f.authority.intent.binding.ticketKeyId=publicMaterials[0].keyId;f.authority.channel.snapshot.binding.ticketKeyId=publicMaterials[0].keyId;},
   f=>f.authority.issuer.epoch++,f=>f.authority.issuer.workspaceId=proofId(),
   f=>f.authority.issuer.installationId=proofId(),f=>f.authority.issuer.revision++,f=>f.authority.issuer.historyDigest=hash('f'),
   f=>f.authority.issuer.protocol='worker-bootstrap-owner-ticket-v1' as any,f=>f.authority.issuer.expiresAt=f.authority.at,
   f=>f.authority.intent.requestId=proofId(),f=>f.authority.intent.baseline.enrollmentGeneration++,f=>f.authority.intent.target.epoch++,
   f=>f.authority.channel.snapshot.binding.hostId=proofId(),f=>f.authority.channel.snapshot.hostGeneration=proofId(),
   f=>f.authority.channel.snapshot.installationGeneration=proofId(),f=>f.authority.channel.snapshot.leafPin=hash('f'),
   f=>f.authority.channel.snapshot.caDigest=hash('f'),f=>f.authority.channel.snapshot.certificateEvidenceDigest=hash('f'),
   f=>f.authority.channel.snapshot.revision++,f=>f.authority.channel.snapshot.certificateEpoch++,f=>f.authority.channel.snapshot.highWaterEpoch++,
   f=>f.authority.channel.previousDigest=hash('f'),f=>f.authority.channel.previousRevision++,f=>f.authority.channel.previousHighWater++,
   f=>f.authority.channel.previousRevoked=false as any,f=>f.authority.channel.unusedGeneration=false as any,f=>f.authority.channel.unusedPin=false as any,
   f=>f.authority.channel.snapshot.publicAddresses=['127.0.0.1'],f=>f.authority.channel.snapshot.publicAddresses=['8.8.8.8','8.8.8.8'],
   f=>f.authority.channel.snapshot.proxy=true as any,f=>f.authority.channel.snapshot.cutoverAt=f.authority.at,
   f=>f.authority.channel.snapshot.certificateNotBefore='2030-01-01T00:00:01.000Z',f=>f.authority.channel.snapshot.expiresAt=f.authority.at,
   f=>f.authority.channel.snapshot.validFrom='2029-12-31T23:59:58Z'
  ];
  for(const [n,mutate] of mutations.entries()){const f=v3AuthorityFixture();mutate(f);refresh(f);assert.throws(()=>validateV3Authority(f.command,f.authority),`mutation ${n}`);}
 });

 await t.test('exact key heads/history, revoked/cutover generations, principal/material separation and duplicate histories deny',()=>{
  for(const role of ['worker','server'] as const){
   for(const field of ['revision','highWater','epoch'] as const){const f=v3AuthorityFixture();f.authority.attachment[role][field]++;refresh(f);assert.throws(()=>validateV3Authority(f.command,f.authority));}
   const f=v3AuthorityFixture();f.authority.reservedPublicKeyDigests.push(f.authority.attachment[role].publicKeyDigest);assert.throws(()=>validateV3Authority(f.command,f.authority));
   const g=v3AuthorityFixture(),h=g.authority[role==='worker'?'workerHistory':'serverHistory'];changeProof(h,'revoke','2029-12-31T23:59:57.000Z');
   g.authority.attachment[role]=proofReference(replayProofKeys(h),1);refresh(g);assert.throws(()=>validateV3Authority(g.command,g.authority));
  }
  const f=v3AuthorityFixture();f.authority.workerHistory.push(copy(f.authority.workerHistory[0]));assert.throws(()=>validateV3Authority(f.command,f.authority));
  const g=v3AuthorityFixture();g.authority.workerHistory[0].receiptDigest=hash('f');assert.throws(()=>validateV3Authority(g.command,g.authority));
  const h=v3AuthorityFixture();[h.authority.attachment.worker,h.authority.attachment.server]=[h.authority.attachment.server,h.authority.attachment.worker];refresh(h);assert.throws(()=>validateV3Authority(h.command,h.authority));
 });

 await t.test('recovery rejects wrong predecessor root, credential, history, generation and reused ceremony IDs',()=>{
  const mutations:((f:Fixture)=>void)[]=[
   f=>f.authority.prior!.ticketId=proofId(),f=>f.authority.prior!.decisionId=proofId(),f=>f.authority.prior!.requestId=proofId(),
   f=>f.authority.prior!.credentialId=proofId(),f=>f.authority.prior!.credentialEpoch++,f=>f.authority.prior!.terminal=false as any,
   f=>f.authority.prior!.credentialRevoked=false as any,f=>f.authority.prior!.predecessor.historyDigest=hash('f'),
   f=>f.authority.intent.prior!.hostId=proofId(),f=>f.authority.intent.prior!.workspaceId=proofId(),f=>f.authority.intent.prior!.generation++,
   f=>f.authority.intent.prior!.credentialEpoch++,f=>f.authority.intent.baseline.credentialHighWater++,
   f=>f.authority.attachment.prior!.worker.historyDigest=hash('f'),f=>f.authority.attachment.worker=copy(f.authority.attachment.prior!.worker),
   ...(['ticketId','decisionId','requestId'] as const).map(key=>(f:Fixture)=>{f.authority.attachment[key]=f.authority.attachment.prior![key];})
  ];
  for(const [n,mutate] of mutations.entries()){const f=v3AuthorityFixture(true);mutate(f);refresh(f);assert.throws(()=>validateV3Authority(f.command,f.authority),`recovery ${n}`);}
 });

 for(const phase of [...v3WritePhases,'immediate','commit','false-commit'])await t.test(`${phase}: rollback/false COMMIT never exposes a partial graph; no automatic or same-instance write retry`,async()=>{
  const f=v3IssuanceFixture();f.hooks.fault=phase;const before=f.state();denied(await f.api.issue(f.command),'reconciliation_required');assert.deepEqual(f.state(),before);
  const count=f.stats.writes;f.hooks.fault='';denied(await f.api.issue(f.command),'reconciliation_required');assert.equal(f.stats.writes,count);assert.equal(f.stats.issuer,1);
 });

 for(const fault of ['lost-ack','readback'])await t.test(`${fault}: independent exact reconciliation finds a committed graph without reissuing`,async()=>{
  const f=v3IssuanceFixture();f.hooks.fault=fault;denied(await f.api.issue(f.command),'reconciliation_required');assert.equal(f.state().operations.length,1);
  f.hooks.fault='';const counts=copy(f.stats),start=f.calls.length,r=await f.api.issue(f.command);closed(r);assert.equal(r.ok,true);assert.equal((r as any).idempotent,true);
  assert.equal(f.stats.writes,counts.writes);assert.equal(f.stats.issuer,counts.issuer);assert.equal(f.stats.sealer,counts.sealer);assert.ok(f.calls.slice(start).every(c=>c.mode==='read'));
 });

 for(const phase of v3WritePhases)await t.test(`${phase}: foreign source drift, extra fence, alien XID or deleted row rolls back`,async()=>{
  for(const kind of ['source','fence','xid','row']){
   const f=v3IssuanceFixture();f.hooks.phase=(p,s)=>{if(p!==phase)return;if(kind==='source')f.changeSource();if(kind==='fence')s.fence++;if(kind==='xid')s.rows.at(-1)!.writerXid='999';if(kind==='row')s.rows.pop();};
   denied(await f.api.issue(f.command),'reconciliation_required');assert.equal(f.state().rows.length,0);assert.equal(f.state().operations.length,0);
  }
 });

 for(const boundary of ['issuer','sealer'] as const)await t.test(`${boundary}: mismatch, verifier denial and fresh authority/time read deny before writes`,async()=>{
  for(const kind of ['verdict','source','time','owner','issuer-history','channel','key-revoke']){
   const f=v3IssuanceFixture();if(kind==='verdict')f.hooks.fault=boundary;
   else f.hooks[boundary]=()=>{
    if(kind==='source')f.changeSource();if(kind==='time')f.source.at=f.source.intent.expiresAt;
    if(kind==='owner')f.source.owner.id=proofId();if(kind==='issuer-history')f.source.issuer.historyDigest=hash('f');
    if(kind==='channel')f.source.channel.snapshot.publicAddresses=['1.1.1.1'];
    if(kind==='key-revoke')changeProof(f.source.workerHistory,'revoke',f.source.at);
   };
   denied(await f.api.issue(f.command));assert.equal(f.stats.writes,0);assert.equal(f.state().operations.length,0);
  }
  const f=v3IssuanceFixture();
  if(boundary==='issuer'){const issue=f.deps.issuer.issue;f.deps.issuer.issue=async(db,r)=>{const e:any=await issue(db,r);e.signed.payload.context.attachmentId=proofId();return e;};}
  else{const seal=f.deps.sealer.seal;f.deps.sealer.seal=async(db,r)=>{const s:any=await seal(db,r);s.payload.linkBinding.attemptId=proofId();return s;};}
  denied(await f.api.issue(f.command));assert.equal(f.stats.writes,0);
 });

 await t.test('hard proof-key cutover crossed during issuer await denies without mutating history',async()=>{
  const f=v3IssuanceFixture(),h=f.source.workerHistory,cutover='2030-01-01T00:00:00.001Z';
  changeProof(h,'stage','2029-12-31T23:59:57.000Z',{targetEpoch:2,material:publicMaterials[1],generation:f.source.attachment.generation,
   provenance:{source:'local_worker_os_protected',evidenceDigest:hash()},activatesAt:'2029-12-31T23:59:58.000Z',cutoverAt:cutover});
  f.source.attachment.worker=proofReference(replayProofKeys(h),1);refresh({authority:f.source,command:f.command});
  const before=copy(h);f.hooks.issuer=()=>{f.source.at=cutover;};denied(await f.api.issue(f.command));assert.deepEqual(h,before);assert.equal(f.stats.writes,0);
 });

 await t.test('twenty competing operation IDs for one attachment yield exactly one winner',async()=>{
  const f=v3IssuanceFixture(),results=await Promise.all(Array.from({length:20},()=>f.api.issue({...f.command,operationId:proofId()})));
  assert.equal(results.filter(r=>r.ok).length,1);results.forEach(closed);assert.equal(f.state().operations.length,1);assert.equal(f.stats.issuer,1);assert.equal(f.stats.sealer,1);
 });

 await t.test('twenty identical submissions reconcile one immutable result with one issuer/sealer call',async()=>{
  const f=v3IssuanceFixture(),results=await Promise.all(Array.from({length:20},()=>f.api.issue(f.command)));
  assert.equal(results.filter(r=>r.ok).length,20);assert.equal(results.filter(r=>(r as any).idempotent===false).length,1);
  assert.equal(f.state().operations.length,1);assert.equal(f.stats.issuer,1);assert.equal(f.stats.sealer,1);
 });

 await t.test('historical replay is read-only; current source drift/ABA or expiry never authorizes send',async()=>{
  const f=v3IssuanceFixture();assert.equal((await f.api.issue(f.command)).ok,true);const before=f.state(),count=copy(f.stats);
  f.changeSource();f.changeSource();f.source.at='2031-01-01T00:00:00.000Z';
  denied(await f.api.beforeSend(f.command));assert.equal((await f.api.inspect(f.command)).ok,true);assert.equal((await f.api.issue(f.command)).ok,true);
  assert.deepEqual(f.state().operations,before.operations);assert.deepEqual(f.state().rows,before.rows);assert.equal(f.stats.writes,count.writes);assert.equal(f.stats.issuer,count.issuer);
  const changed={...f.command,expected:{...f.command.expected,authorityRevision:'9'}};denied(await f.api.issue(changed));assert.equal(f.stats.writes,count.writes);
 });

 await t.test('receipt or graph tampering, ambiguity and XID/fence mismatch cannot reconcile',async()=>{
  const base=v3IssuanceFixture();assert.equal((await base.api.issue(base.command)).ok,true);const saved=base.state();
  for(const mutate of [
   (s:typeof saved)=>s.operations.push(copy(s.operations[0])),(s:typeof saved)=>s.rows.pop(),(s:typeof saved)=>{s.rows.at(-1)!.writerXid='999';},
   (s:typeof saved)=>{s.operations[0].receipt.planDigest=hash('f');},(s:typeof saved)=>{s.operations[0].receipt.rowsDigest=hash('f');},
   (s:typeof saved)=>{s.operations[0].receipt.eventId=proofId();},(s:typeof saved)=>{s.operations[0].receipt.writerXid='999';},
   (s:typeof saved)=>{s.operations[0].receipt.fromFence='1';},(s:typeof saved)=>{s.operations[0].receipt.toFence='1';},(s:typeof saved)=>{s.operations[0].receipt.toFence='999';}
  ]){base.tamper(s=>Object.assign(s,copy(saved)));base.tamper(mutate);denied(await base.api.inspect(base.command));}
 });

 await t.test('transaction return/callback/Db identity and changed isolation fail closed',async()=>{
  const f=v3IssuanceFixture();f.hooks.fault='false-return';denied(await f.api.issue(f.command),'reconciliation_required');
  const g=v3IssuanceFixture(),transaction=g.deps.ports.transaction;
  g.deps.ports.transaction=async(mode,work)=>transaction(mode,async db=>{await work(db);return work(db);});denied(await g.api.issue(g.command));assert.equal(g.stats.writes,0);
  const h=v3IssuanceFixture(),bound=h.deps.ports.bound;let n=0;
  h.deps.ports.bound=async(db,lock)=>{const result:any=await bound(db,lock);if(++n===3)result.isolation='repeatable read';return result;};
  denied(await h.api.issue(h.command));assert.equal(h.stats.writes,0);
  const j=v3IssuanceFixture(),original=j.deps.ports.transaction;let reused:any;
  j.deps.ports.transaction=async(mode,work)=>original(mode,db=>{reused??=db;return work(reused);});denied(await j.api.issue(j.command));assert.equal(j.stats.writes,0);
 });

 await t.test('every transaction boundary requires exact origin/schema/isolation/lock and beforeSend bound XID/fence',async()=>{
  for(const [key,value] of [['origin',false],['schemaSafe',false],['readOnly',false],['isolation','serializable'],['locked',true]]){
   const f=v3IssuanceFixture(),bound=f.deps.ports.bound;f.deps.ports.bound=async(db,lock)=>({...await bound(db,lock) as any,[key as string]:value});
   denied(await f.api.issue(f.command));assert.equal(f.stats.writes,0);assert.equal(f.stats.issuer,0);
  }
  const g=v3IssuanceFixture();g.hooks.fault='guards';denied(await g.api.issue(g.command));assert.equal(g.stats.writes,0);
  for(const key of ['writerXid','fence']){
   const f=v3IssuanceFixture();assert.equal((await f.api.issue(f.command)).ok,true);
   f.hooks.authority=s=>{(s as any)[key]='999';};denied(await f.api.beforeSend(f.command));assert.equal(f.stats.issuer,1);
  }
 });

 await t.test('getter, coercion, noncanonical text and oversized inputs rejected without evaluation',async()=>{
  const f=v3IssuanceFixture();let reads=0;const input=Object.defineProperty({...f.command},'secret',{enumerable:true,get(){reads++;return 'unavailable';}});
  denied(await f.api.issue(input));assert.equal(reads,0);
  for(const input of [{...f.command,operationId:'e\u0301'}, {...f.command,operationId:'x\0y'}, {...f.command,extra:'x'.repeat(131073)}])denied(await f.api.issue(input));
  const p=prepareV3Ticket(f.command,f.authority);assert.throws(()=>v3Transcript(v3Domains.content,f.authority.attachment,p.payload.context,input));assert.equal(reads,0);
 });

 assert.equal(effects,0);assert.deepEqual(logs,[]);
});
