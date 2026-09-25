import test from 'node:test';
import assert from 'node:assert/strict';
import crypto,{randomUUID} from 'node:crypto';
import net from 'node:net';import tls from 'node:tls';import http from 'node:http';import https from 'node:https';import dns from 'node:dns';import childProcess from 'node:child_process';
import {readFileSync} from 'node:fs';
import {nativeAttestationFixture} from './decision-attestation-prisma-fixture';
import {createDecisionAuthorityReader,decisionReaderEvidence,type DecisionReaderTrust} from '../modules/api-keys/bootstrap-decision-authority-reader';
import {createCanonicalBootstrapAuthoritySource} from '../modules/api-keys/worker-bootstrap-authority-source';
import {createPrismaDecisionAttestationPorts} from '../modules/api-keys/decision-attestation-prisma-ports';
import {createAttestedBootstrapComposition} from '../modules/api-keys/bootstrap-attested-composition';
import {lifecycleFlags} from '../modules/api-keys/bootstrap-ticket-lifecycle-contract';

async function fixture(purpose:'first_enrollment'|'owner_recovery'='first_enrollment',sealed=true,cutoverAfter?:number){
 const f=nativeAttestationFixture(purpose,cutoverAfter);assert.equal((await f.execute('attest')).ok,true);
 if(sealed)assert.equal((await f.execute('seal')).ok,true);
 const trustCalls:{db:object;kind:string}[]=[],controls={auth:true,key:true};
 const trust:DecisionReaderTrust={qualification:'synthetic_decision_reader_trust_v1',verifyOwnerAuthentication:async(db,e)=>{
  trustCalls.push({db,kind:'auth'});assert.ok(Object.isFrozen(e));assert.equal(e.auth.ownerId,f.auth.ownerId);return controls.auth;},
  trustPublicKey:async(db,e)=>{trustCalls.push({db,kind:'key'});assert.ok(Object.isFrozen(e));assert.equal(e.key.material.purpose,'owner-decision-attestation-v1');return controls.key;}};
 const config={ports:f.ports,qualification:'native_qualified_decision_read_ports_v1',evidence:decisionReaderEvidence,trust},reader=createDecisionAuthorityReader(config);
 const scope={...f.q,binding:f.b,purpose},attemptId=f.objects().find(o=>o.table==='worker_bootstrap_attempts')?.row.id??randomUUID();
 const source=createCanonicalBootstrapAuthoritySource(f.now,undefined,reader);
 let reads=0,exchanges=0,completions=0;const readDbs:object[]=[],hooks:{read?:(n:number)=>void|Promise<void>;exchange?:()=>void|Promise<void>;complete?:()=>void|Promise<void>}={};
 const deps={qualification:'synthetic_attested_composition_v1' as const,decisionAuthority:reader,
  readTransaction:async<T>(work:(db:any)=>Promise<T>)=>{reads++;await hooks.read?.(reads);return f.deps.transaction('read',db=>{readDbs.push(db);return work(db);});},
  exchange:async()=>{exchanges++;await hooks.exchange?.();return {synthetic:true};},complete:async()=>{completions++;await hooks.complete?.();}};
 const composition=createAttestedBootstrapComposition(deps);
 async function bound<T>(work:(db:any)=>Promise<T>){return f.deps.transaction('read',async db=>{const release=await source.bindTransaction!(db,'read');try{return await work(db);}finally{release();}});}
 return {...f,nativeDeps:f.deps,scope,input:{...scope,attemptId},reader,config,source,composition,deps,controls,trustCalls,readDbs,hooks,bound,
  counts:()=>({reads,exchanges,completions})};
}
test('canonical attested decision reader and source-only composition',async t=>{
 let effects=0;const forbid=()=>{effects++;throw Error('external effect forbidden');};
 for(const m of ['connect','createConnection'] as const)t.mock.method(net,m,forbid);t.mock.method(net.Server.prototype,'listen',forbid);t.mock.method(tls,'connect',forbid);
 for(const mod of [http,https])for(const m of ['request','get'] as const)t.mock.method(mod,m,forbid);
 for(const m of ['lookup','resolve','resolve4','resolve6'] as const){t.mock.method(dns,m,forbid);t.mock.method(dns.promises,m,forbid);}
 t.mock.method(globalThis,'fetch',forbid);
 for(const m of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'] as const)t.mock.method(childProcess,m,forbid);
 for(const m of ['generateKeyPair','generateKeyPairSync','createPrivateKey','sign'] as const)t.mock.method(crypto,m,forbid);

 await t.test('first enrollment and recovery use full native projections, paired distinct Db reads and false flags',async()=>{
  for(const purpose of ['first_enrollment','owner_recovery'] as const){const f=await fixture(purpose),before=f.state(),stats=f.stats(),start=f.calls.length;
   f.hooks.read=n=>{f.at(f.iso(n).replace('Z','123Z'));}; // Fresh time observations must not change the authority digest.
   const status=await f.bound(db=>f.source.inspect(db,f.scope));assert.equal(status.ok,true,JSON.stringify(status));assert.deepEqual(status.blockers,[]);
   const decision=await f.bound(db=>f.source.decision(db,f.q.decisionId));assert.equal((decision as any).qualification,'canonical_decision_authority_source_only_v1');
   const r=await f.composition.run(f.input);assert.equal(r.ok,true,JSON.stringify(r));assert.deepEqual(f.counts(),{reads:4,exchanges:1,completions:1});
   assert.equal(new Set(f.readDbs).size,4);for(const [k,v] of Object.entries(lifecycleFlags))assert.equal((r as any)[k],v);
   assert.deepEqual(f.state(),before);assert.equal(f.stats().writes,stats.writes);assert.equal(f.stats().signatures,stats.signatures);
   assert.ok(f.calls.slice(start).every(c=>c.mode==='read'&&!/^(INSERT|UPDATE|DELETE)\b|FOR UPDATE/.test(c.sql)));
   for(const db of f.readDbs){const sql=f.calls.filter(c=>c.db===db).map(c=>c.sql).join('\n');
    for(const marker of ['FROM objects o','bootstrap_lifecycle_current','FROM worker_identity_lifecycle l','FROM bootstrap_issuer_history h','FROM pg_trigger'])assert.ok(sql.includes(marker),marker);
    assert.ok(f.trustCalls.some(c=>c.db===db&&c.kind==='auth'));assert.ok(f.trustCalls.some(c=>c.db===db&&c.kind==='key'));}
  }
 });
 await t.test('missing, copied, wrong tag/version/evidence and overridden ports cannot acquire a reader',async()=>{
  const f=await fixture();for(const change of [{ports:undefined},{ports:{...f.ports}},{qualification:'production'},
   {evidence:{...decisionReaderEvidence,portsVersion:'v2'}},{evidence:{...decisionReaderEvidence,migration83LfSha256:'0'.repeat(64)}},
   {evidence:null},{trust:undefined},{trust:{...f.config.trust,qualification:'production'}},
   {ports:{...f.ports,projectCanonical:async()=>f.projection()}}])assert.throws(()=>createDecisionAuthorityReader({...f.config,...change} as any));
  for(const dependency of [undefined,{...f.reader},{}]){const s=createCanonicalBootstrapAuthoritySource(f.now,undefined,dependency);
   await f.nativeDeps.transaction('read',async db=>{const release=await s.bindTransaction!(db,'read');try{
    await assert.rejects(s.inspectDecisionAuthority(db,f.scope),/canonical_bootstrap_authority_blocked/);
    await assert.rejects(s.decision(db,f.q.decisionId),/canonical_bootstrap_authority_blocked/);
   }finally{release();}});}
  assert.equal((await createAttestedBootstrapComposition().run(f.input)).ok,false);
 });
 await t.test('unsigned, invalid signature, absent verifier and untrusted auth/key deny before exchange',async()=>{
  for(const cause of ['unsigned','signature','ticket','auth','key','noVerifier','noTicketVerifier']){const f=await fixture();
   if(cause==='unsigned')f.remove('decision_attestations');else if(cause==='auth')f.controls.auth=false;else if(cause==='key')f.controls.key=false;
   else if(cause!=='noVerifier'&&cause!=='noTicketVerifier')f.fault(cause);
   if(cause==='noVerifier'||cause==='noTicketVerifier'){
    const ports=createPrismaDecisionAttestationPorts({...f.nativeDeps,[cause==='noVerifier'?'verifier':'ticketVerifier']:undefined});
    const reader=createDecisionAuthorityReader({...f.config,ports});
    assert.equal((await createAttestedBootstrapComposition({...f.deps,decisionAuthority:reader}).run(f.input)).ok,false);
   }else assert.equal((await f.composition.run(f.input)).ok,false,cause);
   assert.equal(f.counts().exchanges,0,cause);
  }
 });
 await t.test('owner, accepted revision, policy, auth, key history and binding drift deny',async()=>{
  const mutations=[(f:Awaited<ReturnType<typeof fixture>>)=>{f.objects().find(o=>o.table==='workspaces')!.row.owner_user_id=randomUUID();},
   (f:Awaited<ReturnType<typeof fixture>>)=>f.revise(),
   (f:Awaited<ReturnType<typeof fixture>>)=>{f.objects().find(o=>o.table==='decision_revisions')!.row.body.ownerDecisionAttestation.revision++;},
   (f:Awaited<ReturnType<typeof fixture>>)=>{f.objects().find(o=>o.table==='decision_owner_auth_evidence')!.row.record.level='webauthn';},
   (f:Awaited<ReturnType<typeof fixture>>)=>{f.objects().find(o=>o.table==='decision_attestation_key_history')!.row.epoch++;},
   (f:Awaited<ReturnType<typeof fixture>>)=>{f.objects().find(o=>o.table==='decision_attestations')!.row.record.payload.ticketId=randomUUID();}];
  for(const mutate of mutations){const f=await fixture();mutate(f);assert.equal((await f.composition.run(f.input)).ok,false);assert.equal(f.counts().exchanges,0);}
  for(const cause of ['key','grant','policy','current','history','generation','lifecycle','issuer']){const f=await fixture();f.fault(cause);
   assert.equal((await f.composition.run(f.input)).ok,false,cause);assert.equal(f.counts().exchanges,0);}
 });
 await t.test('terminal decisions and notBefore/expiry never mutate status',async()=>{
  for(const action of ['supersede','revoke','reject','expire']){const f=await fixture();if(action==='expire')f.at(f.iso(60001).replace('Z','123Z'));
   assert.equal((await f.execute('terminal',{action})).ok,true);const before=f.state();assert.equal((await f.composition.inspect(f.scope)).ok,false);
   assert.equal((await f.composition.run(f.input)).ok,false);assert.deepEqual(f.state(),before);assert.equal(f.counts().exchanges,0);}
  for(const offset of [-750,60000]){const f=await fixture();f.at(f.iso(offset).replace('Z','123Z'));const before=f.state();
   assert.equal((await f.composition.inspect(f.scope)).ok,false);assert.equal((await f.composition.run(f.input)).ok,false);assert.deepEqual(f.state(),before);}
 });
 await t.test('channel cutover and expiry/source changes during verification invalidate the final read',async()=>{
  const cutover=await fixture('first_enrollment',true,1000);cutover.at(cutover.iso(1000).replace('Z','123Z'));
  assert.equal((await cutover.composition.run(cutover.input)).ok,false);assert.equal(cutover.counts().exchanges,0);
  for(const cause of ['clock','owner','fence']){const f=await fixture();const reader=createDecisionAuthorityReader({...f.config,trust:{...f.config.trust,
    verifyOwnerAuthentication:async()=>{if(cause==='clock')f.at(f.iso(60000).replace('Z','123Z'));if(cause==='fence')f.drift();
     if(cause==='owner')f.objects().find(o=>o.table==='workspaces')!.row.owner_user_id=randomUUID();return true;}}});
   assert.equal((await createAttestedBootstrapComposition({...f.deps,decisionAuthority:reader}).run(f.input)).ok,false,cause);assert.equal(f.counts().exchanges,0);}
 });
 await t.test('sealed authority requires the exact committed operation receipt and original source fence',async()=>{
  for(const cause of ['missing','mismatch','readback','incomplete','event','staleFence']){const f=await fixture();
   if(cause==='staleFence')f.drift();else f.fault(cause);
   // A self-consistent current projection alone cannot replace the seal COMMIT receipt.
   const r=await f.composition.run(f.input);assert.equal(r.ok,false,cause);assert.equal(f.counts().exchanges,0);}
 });
 await t.test('missing, mismatched and terminal attempt seals deny; repeated attempts never exchange twice',async()=>{
  const absent=await fixture('first_enrollment',false);assert.equal((await absent.composition.inspect(absent.scope)).ok,true);
  assert.equal((await absent.composition.run(absent.input)).ok,false);assert.equal(absent.counts().exchanges,0);
  for(const mutate of [(f:Awaited<ReturnType<typeof fixture>>)=>delete f.objects().find(o=>o.table==='worker_bootstrap_attempts')!.row.attestation_seal,
   (f:Awaited<ReturnType<typeof fixture>>)=>{f.input.attemptId=randomUUID();},
   (f:Awaited<ReturnType<typeof fixture>>)=>{f.objects().find(o=>o.table==='worker_bootstrap_attempts')!.row.attestation_seal.attestationDigest='0'.repeat(64);},
   (f:Awaited<ReturnType<typeof fixture>>)=>{f.objects().find(o=>o.table==='worker_bootstrap_heads')!.row.state='delivery_unknown';}]){
   const f=await fixture();mutate(f);assert.equal((await f.composition.run(f.input)).ok,false);assert.equal(f.counts().exchanges,0);}
  const f=await fixture();assert.equal((await f.composition.run(f.input)).ok,true);assert.equal((await f.composition.run(f.input)).ok,false);
  assert.equal((await createAttestedBootstrapComposition(f.deps).run(f.input)).ok,false);assert.equal(f.counts().exchanges,1);
 });
 await t.test('authority, digest, fence and seal drift between before-send projections cause zero exchange',async()=>{
  for(const kind of ['fence','revision','seal','revoke']){const f=await fixture();f.hooks.read=async n=>{if(n!==2)return;
   if(kind==='fence')f.drift();if(kind==='revision')f.revise();if(kind==='revoke')await f.execute('terminal',{action:'revoke'});
   if(kind==='seal')f.objects().find(o=>o.table==='worker_bootstrap_attempts')!.row.attestation_seal.sourceDigest='0'.repeat(64);};
   const r=await f.composition.run(f.input);assert.equal(r.ok,false,kind);assert.equal('error'in r&&r.error,'denied');assert.equal(f.counts().exchanges,0);}
 });
 await t.test('after possible commit, exchange/completion/drift uncertainty is terminal unknown without retry',async()=>{
  for(const kind of ['exchange','complete','revision','revoke','fence','fourth_read']){const f=await fixture();
   f.hooks.exchange=async()=>{if(kind==='exchange')throw Error('synthetic lost ACK');if(kind==='revision')f.revise();
    if(kind==='revoke')await f.execute('terminal',{action:'revoke'});if(kind==='fence')f.drift();};
   if(kind==='complete')f.hooks.complete=()=>{throw Error('synthetic uncertain completion');};
   if(kind==='fourth_read')f.hooks.read=n=>{if(n===4)f.drift();};
   const r=await f.composition.run(f.input);assert.equal('error'in r&&r.error,'delivery_unknown',kind);assert.equal('reconciliationRequired'in r&&r.reconciliationRequired,true);
   assert.equal('retryable'in r&&r.retryable,false);assert.equal((await f.composition.run(f.input)).ok,false);assert.equal(f.counts().exchanges,1);
   assert.equal(f.counts().completions,kind==='complete'?1:0);}
 });
 await t.test('twenty concurrent runs have one exchange; revise/revoke racing twenty reads cannot restore authority',async()=>{
  const f=await fixture();const results=await Promise.all(Array.from({length:20},()=>f.composition.run(f.input)));
  assert.equal(results.filter(r=>r.ok).length,1);assert.equal(f.counts().exchanges,1);
  for(const kind of ['revise','revoke']){const g=await fixture();const writer=kind==='revise'?Promise.resolve().then(()=>g.revise()):g.execute('terminal',{action:'revoke'});
   await Promise.allSettled([writer,...Array.from({length:20},()=>g.composition.inspect(g.scope))]);
   const denied=await Promise.all(Array.from({length:20},()=>g.composition.run(g.input)));assert.ok(denied.every(r=>!r.ok));assert.equal(g.counts().exchanges,0);}
 });
 await t.test('unbound, write transactions, reused Db, repeated callbacks and fabricated read returns deny',async()=>{
  const f=await fixture();await assert.rejects(f.source.inspectDecisionAuthority({} as any,f.scope));
  await f.deps.readTransaction(async db=>{await assert.rejects(f.source.bindTransaction!(db,'write'));});
  for(const kind of ['repeat','fabricated','sameDb']){const g=await fixture();let cached:any;
   const readTransaction=async<T>(work:(db:any)=>Promise<T>)=>g.deps.readTransaction(async db=>{
    const r=await work(kind==='sameDb'?(cached??=db):db);if(kind==='repeat')await work(db);return kind==='fabricated'?structuredClone(r):r;});
   const result=await createAttestedBootstrapComposition({...g.deps,readTransaction}).run(g.input);assert.equal(result.ok,false,kind);assert.equal(g.counts().exchanges,0);}
 });
 await t.test('status rejects authority/network overrides and all reads remain pure',async()=>{
  const f=await fixture(),before=f.state(),writes=f.stats().writes;
  for(const extra of [{authorityRevision:3},{signature:'a'.repeat(128)},{seal:{}},{endpoint:'https://other.example'},
   {force:true},{profile:{}},{evidence:decisionReaderEvidence},{decisionAuthority:f.reader}]){
   assert.equal((await f.composition.inspect({...f.scope,...extra})).ok,false);assert.equal((await f.composition.run({...f.input,...extra})).ok,false);}
  assert.deepEqual(f.state(),before);assert.equal(f.stats().writes,writes);assert.equal(f.counts().exchanges,0);
  const reader=readFileSync('src/modules/api-keys/bootstrap-decision-authority-reader.ts','utf8');
  assert.ok(!reader.includes('decisionGovernanceView'));assert.ok(!reader.includes('$executeRaw'));assert.equal(effects,0);
 });
});
