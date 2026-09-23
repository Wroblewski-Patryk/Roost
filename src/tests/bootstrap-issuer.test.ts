import test from 'node:test';
import assert from 'node:assert/strict';
import crypto,{createHash,randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import net from 'node:net';import tls from 'node:tls';import http from 'node:http';import https from 'node:https';import dns from 'node:dns';import childProcess from 'node:child_process';
import {issuerMaterial,issuerGaps,replayIssuer,selectIssuer,type IssuerIntent,type IssuerRecord,type IssuerHead} from '../modules/api-keys/bootstrap-issuer-contract';
import {issuerGuards} from '../modules/api-keys/bootstrap-issuer-guards';
import {createPrismaBootstrapIssuerStore,IssuerReconciliationRequired} from '../modules/api-keys/bootstrap-issuer-store';
import {createCanonicalBootstrapAuthoritySource,CanonicalBootstrapBlocked} from '../modules/api-keys/worker-bootstrap-authority-source';
import {advanceLifecycle} from '../modules/api-keys/worker-identity-lifecycle';
import {decisionAuthority} from '../modules/decisions/decision-authority';
const copy=<T>(v:T):T=>structuredClone(v),hash=(s:string)=>s.repeat(64),base=Date.parse('2026-09-23T12:00:00.000Z');
// Public Ed25519 points only. No keypair/seed/signature generation or fixtures.
const points=['d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a','3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c','fc51cd8e6218a1a38da47ed00230f0580816ed13ba3303ac5deb911548908025'];
const materials=points.map((point,n)=>{const bytes=Buffer.from('302a300506032b6570032100'+point,'hex');return issuerMaterial.parse({keyId:'public-'+n,algorithm:'Ed25519',format:'spki-der-base64',spki:bytes.toString('base64'),publicKeyDigest:createHash('sha256').update(bytes).digest('hex')});});
function fixture(legacy=true,initialEpoch=1){
  const workspaceId=randomUUID(),installationId=randomUUID(),hostId=randomUUID(),ownerId=randomUUID(),binding={workspaceId,issuerId:workspaceId,installationId,purpose:'worker-bootstrap-owner-ticket-v1' as const};
  let anchor:IssuerHead|null=legacy?{workspaceId,installationId,keyId:materials[0].keyId,epoch:initialEpoch,publicKeyDigest:materials[0].publicKeyDigest}:null;
  let records:IssuerRecord[]=[],audits:{id:string;fence:number}[]=[],fence=1,now=base,fault='',available=true,current=true,verified=true,tail=Promise.resolve();
  const guards:any[]=issuerGuards.map(g=>({...g,enabled:true})),decisions=new Map<string,any>(),calls:string[]=[],options:any[]=[];
  const lifecycle:any[]=[];const generation=randomUUID();
  for(const kind of ['installation','host'] as const){const i={schemaVersion:'worker-identity-lifecycle-v1' as const,workspaceId,kind,subjectId:kind==='host'?hostId:installationId,
    action:'adopt' as const,expected:null,generation:kind==='host'?randomUUID():generation,installationId,installationGeneration:generation,hostFingerprint:kind==='host'?hash('a'):null,
    authorityDigest:hash('b'),adoptionEvidenceDigest:hash('c'),expiresAt:new Date(base+3600000).toISOString()};
    lifecycle.push(advanceLifecycle(i,[],{ownerId,decisionId:randomUUID(),decisionRevision:1,intent:i,current:true,anchorFresh:false,hostEnabled:true,writerFenced:true,installation:lifecycle[0]??null},randomUUID(),new Date(base)));}
  const client:any={$transaction:async(work:any,option:any)=>{
    let release!:()=>void;const previous=tail;tail=new Promise<void>(r=>release=r);await previous;
    const saved=copy({anchor,records,audits,fence});let readonly=false;options.push(option);
    const db:any={$executeRaw:async(strings:TemplateStringsArray,...values:any[])=>{
      const sql=strings.join('?').replace(/\s+/g,' ').trim();calls.push(sql);
      if(sql==='SET TRANSACTION READ ONLY'){readonly=true;return 0;}assert.equal(readonly,false);assert.equal(option.isolationLevel,'Serializable');
      if(sql.startsWith('UPDATE ready_source_fence')){fence++;if(fault==='fence')throw Error('redacted');return 1;}
      if(sql.startsWith('INSERT INTO trusted_provider_ticket_keys')){assert.equal(anchor,null);anchor={workspaceId:values[0],installationId:values[1],keyId:values[2],epoch:1,publicKeyDigest:values[3]};fence++;if(fault==='state')throw Error('redacted');return 1;}
      assert.ok(sql.startsWith('INSERT INTO bootstrap_issuer_history'));const r=JSON.parse(values[4]) as IssuerRecord;
      fence++;records.push(copy(r));if(fault==='history')throw Error('redacted');
      if(r.intent.action==='stage'){anchor={...anchor!,keyId:r.intent.material!.keyId,epoch:r.intent.targetEpoch,publicKeyDigest:r.intent.material!.publicKeyDigest};fence++;}
      if(fault==='state')throw Error('redacted');audits.push({id:r.id,fence});if(fault==='audit')throw Error('redacted');return 1;
    },$queryRaw:async(strings:TemplateStringsArray,...values:any[])=>{
      const sql=strings.join('?').replace(/\s+/g,' ').trim();calls.push(sql);
      if(sql.includes('to_regclass'))return [{available}];
      if(sql.includes('FROM pg_trigger'))return copy(guards);
      if(sql.includes('worker_identity_lifecycle_guarded()'))return [{guarded:true}];
      if(sql.includes('FROM worker_identity_lifecycle l'))return lifecycle.filter(r=>r.intent.kind===values[1]&&r.intent.subjectId===values[2]).map(record=>({record:copy(record),verified:true}));
      if(sql.includes('FROM bootstrap_issuer_history h'))return records.map(record=>({record:copy(record),fence:String(audits.find(a=>a.id===record.id)?.fence??0),verified:verified&&audits.some(a=>a.id===record.id)}));
      if(sql.includes('FROM trusted_provider_ticket_keys WHERE'))return anchor?[copy(anchor)]:[];
      if(sql.includes('FROM decisions d')){const c=decisions.get(values[0]);return c?[{ownerId,revision:c.decisionRevision,intent:copy(c.intent),current}]:[];}
      if(sql.includes('FROM ready_source_fence'))return [{revision:String(fence),isolation:option.isolationLevel==='Serializable'?'serializable':'repeatable read',readonly:readonly?'on':'off'}];
      assert.fail('unexpected issuer query');
    }};
    try{const result=await work(db);
      if(!readonly&&fault==='false_ack'){({anchor,records,audits,fence}=saved);return result;}
      if(!readonly&&['commit','unknown'].includes(fault))throw Error('redacted');return result;
    }catch(e){if(fault!=='unknown')({anchor,records,audits,fence}=saved);throw e;}finally{release();}
  }};
  const store=createPrismaBootstrapIssuerStore(client,()=>new Date(now));
  const intent=(action:IssuerIntent['action'],patch:Partial<IssuerIntent>={}):IssuerIntent=>({schemaVersion:'bootstrap-issuer-v1',binding,action,expectedRevision:records.length,
    targetEpoch:action==='stage'?(anchor?.epoch??0)+1:anchor?.epoch??1,material:['create','adopt'].includes(action)?materials[0]:action==='stage'?materials[1]:null,
    activatesAt:action==='stage'?new Date(now+1000).toISOString():null,cutoverAt:action==='stage'?new Date(now+10000).toISOString():null,
    adoptionEvidenceDigest:action==='adopt'?hash('c'):null,expiresAt:new Date(now+3600000).toISOString(),...patch});
  const command=(i:IssuerIntent)=>{const c={operationId:randomUUID(),decisionId:randomUUID(),decisionRevision:1,intent:i};decisions.set(c.decisionId,copy(c));return c;};
  const apply=(i:IssuerIntent)=>store.apply(command(i));
  const bind=(n=0,epoch=initialEpoch)=>({workspaceId,hostId,installationId,hostEpoch:1,installationEpoch:1,hostFingerprint:hash('a'),ticketKeyId:materials[n].keyId,ticketKeyEpoch:epoch,ticketPublicKeyDigest:materials[n].publicKeyDigest});
  return {client,store,intent,command,apply,bind,guards,ownerId,calls,options,records:()=>copy(records),head:()=>copy(anchor),state:()=>copy({anchor,records,audits,fence}),
    at:(ms:number)=>now=base+ms,iso:(ms=0)=>new Date(base+ms).toISOString(),fault:(v:string)=>fault=v,available:(v:boolean)=>available=v,current:(v:boolean)=>current=v,verified:(v:boolean)=>verified=v};
}
test('source-only canonical bootstrap issuer public lifecycle',async t=>{
  let effects=0;const forbid=()=>{effects++;throw Error('effect forbidden');};
  for(const m of ['connect','createConnection'] as const)t.mock.method(net,m,forbid);t.mock.method(net.Server.prototype,'listen',forbid);t.mock.method(tls,'connect',forbid);
  for(const module of [http,https])for(const m of ['request','get'] as const)t.mock.method(module,m,forbid);
  for(const m of ['lookup','resolve','resolve4','resolve6'] as const){t.mock.method(dns,m,forbid);t.mock.method(dns.promises,m,forbid);}
  t.mock.method(globalThis,'fetch',forbid);for(const m of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'] as const)t.mock.method(childProcess,m,forbid);
  for(const m of ['generateKeyPair','generateKeyPairSync','createPrivateKey','sign'] as const)t.mock.method(crypto,m,forbid);
  const logs:unknown[]=[];for(const m of ['log','warn','error'] as const)t.mock.method(console,m,(...v:unknown[])=>logs.push(v));
  await t.test('legacy is unavailable; fresh create and explicit owner adoption establish only prospective authority',async()=>{
    const f=fixture();assert.deepEqual((await f.store.inspect(f.bind())).blockers,[...issuerGaps]);await assert.rejects(f.apply(f.intent('create')));
    await assert.rejects(f.apply(f.intent('adopt',{adoptionEvidenceDigest:null})));f.current(false);await assert.rejects(f.apply(f.intent('adopt')));f.current(true);
    await f.apply(f.intent('adopt'));assert.deepEqual((await f.store.inspect(f.bind())).blockers,[]);
    assert.deepEqual((await f.store.inspect(f.bind(),f.iso(-1))).blockers,[...issuerGaps]);
    const fresh=fixture(false);await fresh.apply(fresh.intent('create'));assert.deepEqual((await fresh.store.inspect(fresh.bind())).blockers,[]);
    const old=fixture(true,12);await old.apply(old.intent('adopt'));assert.equal((await old.store.inspect(old.bind())).facts!.highWater,12);
  });
  await t.test('stage reserves a monotonic epoch; exact issue-time overlap ends at hard cutover',async()=>{
    const f=fixture();await f.apply(f.intent('adopt'));await f.apply(f.intent('stage'));
    assert.equal(f.head()!.epoch,2);assert.deepEqual((await f.store.inspect(f.bind(1,2))).blockers,[...issuerGaps]);
    f.at(1000);assert.deepEqual((await f.store.inspect(f.bind(0,1),f.iso())).blockers,[]);assert.deepEqual((await f.store.inspect(f.bind(1,2),f.iso(1000))).blockers,[]);
    assert.deepEqual((await f.store.inspect(f.bind(1,2),f.iso())).blockers,[...issuerGaps]);assert.deepEqual((await f.store.inspect(f.bind(),f.iso(1001))).blockers,[...issuerGaps]);
    await assert.rejects(f.apply(f.intent('cutover')));f.at(10000);
    for(const b of [f.bind(),f.bind(1,2)])assert.deepEqual((await f.store.inspect(b,f.iso(1000))).blockers,[...issuerGaps]);
    await f.apply(f.intent('cutover'));assert.deepEqual((await f.store.inspect(f.bind(1,2),f.iso(1000))).blockers,[]);
    assert.deepEqual((await f.store.inspect(f.bind(),f.iso())).blockers,[...issuerGaps]);assert.equal(replayIssuer(f.records())!.generations[0].state,'retired');
  });
  await t.test('revocation and retirement are terminal and never decrease high-water or permit ABA',async()=>{
    const f=fixture();await f.apply(f.intent('adopt'));await f.apply(f.intent('stage'));await f.apply(f.intent('revoke'));
    await assert.rejects(f.apply(f.intent('cutover')));await assert.rejects(f.apply(f.intent('revoke')));
    await assert.rejects(f.apply(f.intent('stage',{material:materials[0]})));await assert.rejects(f.apply(f.intent('stage',{material:materials[1]})));
    await f.apply(f.intent('stage',{material:materials[2]}));assert.equal(f.head()!.epoch,3);
    f.at(10000);await f.apply(f.intent('retire',{targetEpoch:1}));await assert.rejects(f.apply(f.intent('cutover',{targetEpoch:1})));
    await f.apply(f.intent('cutover'));assert.equal((await f.store.inspect(f.bind(2,3),f.iso(1000))).facts!.epoch,3);
    await f.apply(f.intent('revoke'));assert.deepEqual((await f.store.inspect(f.bind(2,3))).blockers,[...issuerGaps]);
  });
  await t.test('strict canonical format, binding and bounded overlap reject stale or mismatched proposals',async()=>{
    for(const patch of [{algorithm:'RSA'},{format:'pem'},{spki:materials[0].spki+'\n'},{publicKeyDigest:hash('a')},{privateKey:'rejected-field'}])assert.throws(()=>issuerMaterial.parse({...materials[0],...patch}));
    const f=fixture();await f.apply(f.intent('adopt'));
    for(const patch of [{targetEpoch:1},{targetEpoch:3},{cutoverAt:f.iso(302000)},{activatesAt:f.iso(-1)},{binding:{...f.intent('stage').binding,issuerId:randomUUID()}}])await assert.rejects(f.apply(f.intent('stage',patch)));
    for(const patch of [{workspaceId:randomUUID()},{installationId:randomUUID()},{ticketKeyId:'stale'},{ticketKeyEpoch:2},{ticketPublicKeyDigest:hash('f')}])assert.deepEqual((await f.store.inspect({...f.bind(),...patch})).blockers,[...issuerGaps]);
    const state=replayIssuer(f.records())!;assert.throws(()=>selectIssuer(state,{...f.head()!,epoch:2},f.bind(),f.iso(),new Date(base)));
  });
  await t.test('twenty serialized writers admit one transition; operation/decision replay cannot append',async()=>{
    const f=fixture();await f.apply(f.intent('adopt'));const c=f.command(f.intent('stage'));
    const results=await Promise.allSettled(Array.from({length:20},()=>f.store.apply(c)));assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
    assert.equal(f.records().length,2);assert.equal(f.head()!.epoch,2);await assert.rejects(f.store.apply(c));
  });
  await t.test('fence, state, history, audit and COMMIT rejection restore the entire snapshot',async()=>{
    for(const fault of ['fence','state','history','audit','commit','false_ack']){const f=fixture();await f.apply(f.intent('adopt'));const before=f.state();f.fault(fault);
      await assert.rejects(f.apply(f.intent('stage')));assert.deepEqual(f.state(),before,fault);}
    const f=fixture(false),before=f.state();f.fault('state');await assert.rejects(f.apply(f.intent('create')));assert.deepEqual(f.state(),before);
  });
  await t.test('an unknown COMMIT result never replays or reports a successful write',async()=>{
    const f=fixture();await f.apply(f.intent('adopt'));const start=f.calls.length;f.fault('unknown');
    await assert.rejects(f.apply(f.intent('stage')),(e:any)=>e instanceof IssuerReconciliationRequired&&e.retryable===false);
    assert.equal(f.head()!.epoch,2);assert.equal(f.calls.slice(start).filter(q=>q.startsWith('INSERT INTO bootstrap_issuer_history')).length,1);
  });
  await t.test('missing/disabled/rebound/changed/predicated guards, unfenced writers and missing audit fail closed',async()=>{
    for(let n=0;n<issuerGuards.length;n++)for(const mode of ['missing','disabled','function','hash','kind','extra']){
      const f=fixture();await f.apply(f.intent('adopt'));const before=f.state();
      if(mode==='missing')f.guards.splice(n,1);else if(mode==='disabled')f.guards[n].enabled=false;else if(mode==='kind')f.guards[n].kind=0;else if(mode==='extra')f.guards[n].predicate='untrusted';else f.guards[n][mode]='changed';
      assert.deepEqual((await f.store.inspect(f.bind())).blockers,[...issuerGaps]);await assert.rejects(f.apply(f.intent('stage')));assert.deepEqual(f.state(),before);
    }
    const f=fixture();await f.apply(f.intent('adopt'));f.verified(false);assert.deepEqual((await f.store.inspect(f.bind())).blockers,[...issuerGaps]);await assert.rejects(f.apply(f.intent('stage')));
    f.verified(true);f.available(false);assert.deepEqual((await f.store.inspect(f.bind())).blockers,[...issuerGaps]);
  });
  await t.test('inspect is SQL READ ONLY, performs no repair and leaves all state/fence unchanged',async()=>{
    const f=fixture();await f.apply(f.intent('adopt'));const before=f.state(),start=f.calls.length;
    for(let n=0;n<3;n++)assert.deepEqual((await f.store.inspect(f.bind())).blockers,[]);
    assert.deepEqual(f.state(),before);assert.ok(f.calls.slice(start).every(q=>q.startsWith('SELECT')||q==='SET TRANSACTION READ ONLY'));assert.equal(f.options.at(-1).isolationLevel,'RepeatableRead');
  });
  await t.test('canonical bootstrap source clears only the two issuer gaps and still blocks the other three',async()=>{
    const f=fixture();await f.apply(f.intent('adopt'));const source=createCanonicalBootstrapAuthoritySource(()=>new Date(base));
    await f.client.$transaction(async(db:any)=>{await db.$executeRaw`SET TRANSACTION READ ONLY`;const release=await source.bindTransaction!(db,'read');
      try{await assert.rejects(source.context(db,f.bind(),f.iso()),(e:any)=>e instanceof CanonicalBootstrapBlocked&&JSON.stringify(e.blockers)===JSON.stringify(['bootstrap_channel_authority_unavailable','bootstrap_ticket_revocation_unavailable','signed_current_decision_unavailable']));}
      finally{release();}
    },{isolationLevel:'RepeatableRead'});
  });
  await t.test('owner reservation ignores forged delegation and secret-shaped input is never stored or logged',async()=>{
    const f=fixture(),i=f.intent('adopt'),c=f.command(i);await assert.rejects(f.store.apply({...c,privateKey:'rejected-field'}));await assert.rejects(f.store.apply({...c,intent:{...i,seed:'rejected-field'}}));
    assert.equal(f.records().length,0);assert.ok(!JSON.stringify(f.state()).includes('rejected-field'));
    const result=await decisionAuthority({} as any,i.binding.workspaceId,{workerBootstrapIssuer:i,authority:{domain:'ordinary_domain'}},{},{ownerUserId:f.ownerId,ownerActive:true,truncated:false,mandates:[],workers:[],labels:[]});
    assert.equal(result.status,'owner_reserved');assert.equal(result.reason,'bootstrap_issuer');
  });
  await t.test('unapplied migration is additive and every required guard fingerprint matches reviewed source',()=>{
    const paths=['20260923090000_trusted_provider_owner_tickets','20260923210000_worker_identity_lifecycle','20260923220000_bootstrap_issuer_public_history'];
    const sql=paths.map(p=>readFileSync('prisma/migrations/'+p+'/migration.sql','utf8').replace(/\r/g,''));
    for(const g of issuerGuards){const body=sql.join('\n').match(new RegExp('CREATE FUNCTION '+g.function+'\\(\\).*?AS \\$\\$([\\s\\S]*?)\\$\\$;'))![1];
      assert.equal(createHash('sha256').update(body).digest('hex'),g.hash);}
    assert.doesNotMatch(sql[2],/CREATE OR REPLACE|DROP |DEFAULT|UPDATE agent_hosts|INSERT INTO workspaces/);
    assert.match(sql[2],/BEFORE INSERT OR UPDATE OR DELETE ON trusted_provider_ticket_keys/);assert.match(sql[2],/UPDATE ready_source_fence SET revision=revision\+1/);
    assert.match(sql[2],/pg_trigger_depth\(\)<>2/);assert.match(sql[2],/body->'workerBootstrapIssuer' IS DISTINCT FROM i/);
  });
  assert.equal(effects,0);assert.deepEqual(logs,[]);
});
