import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import net from 'node:net';
import tls from 'node:tls';
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import childProcess from 'node:child_process';
import { advanceLifecycle,lifecycleMissing,projectLifecycle,type LifecycleIntent,type LifecycleRecord } from '../modules/api-keys/worker-identity-lifecycle';
import { createPrismaWorkerIdentityLifecycleStore,LifecycleReconciliationRequired } from '../modules/api-keys/worker-identity-lifecycle-store';
import { createCanonicalBootstrapAuthoritySource,bootstrapAuthorityGaps,CanonicalBootstrapBlocked } from '../modules/api-keys/worker-bootstrap-authority-source';
import { decisionAuthority } from '../modules/decisions/decision-authority';
const copy=<T>(v:T):T=>structuredClone(v),hash=(s:string)=>s.repeat(64),now=new Date('2026-09-23T12:00:00Z');

function fixture(){
  const workspaceId=randomUUID(),hostId=randomUUID(),installationId=randomUUID(),ownerId=randomUUID(),installationGeneration=randomUUID();
  let records:LifecycleRecord[]=[],audits:string[]=[],fence=1,guarded=true,fault='',fresh=false,enabled=true,current=true,verified=true,tail=Promise.resolve();
  const decisions=new Map<string,any>(),calls:string[]=[],options:any[]=[];
  const client:any={$transaction:async(work:any,option:any)=>{
    let release!:()=>void;const previous=tail;tail=new Promise<void>(r=>release=r);await previous;
    const saved={records:copy(records),audits:[...audits],fence};let readOnly=false;
    const db:any={$executeRaw:async(strings:TemplateStringsArray,...values:any[])=>{
      const sql=strings.join('?');calls.push(sql);
      if(sql==='SET TRANSACTION READ ONLY'){readOnly=true;return 0;}
      assert.equal(readOnly,false);
      if(sql.startsWith('UPDATE ready_source_fence')){fence++;if(fault==='fence')throw Error('synthetic-private-error');return 1;}
      assert.ok(sql.startsWith('INSERT INTO worker_identity_lifecycle('));
      const r=JSON.parse(values[9]) as LifecycleRecord;
      const prior=records.filter(x=>x.intent.kind===r.intent.kind&&x.intent.subjectId===r.intent.subjectId).at(-1);
      assert.equal(r.previousId,prior?.id??null);assert.equal(r.epoch,(prior?.epoch??0)+1);
      if(records.some(x=>x.decisionId===r.decisionId))throw Error('decision once');
      fence++;records.push(copy(r));if(fault==='state'||fault==='history')throw Error('synthetic-private-error');
      audits.push(r.id);if(fault==='audit')throw Error('synthetic-private-error');return 1;
    },$queryRaw:async(strings:TemplateStringsArray,...values:any[])=>{
      const sql=strings.join('?').replace(/\s+/g,' ');calls.push(sql);
      if(sql.includes('WHERE l.id=')){
        if(fault==='confirmation_read')throw Error('synthetic-private-error');
        const record=records.find(r=>r.id===values[1]);
        return record?[{verified:fault!=='confirmation_mismatch'&&verified&&audits.includes(record.id)&&JSON.stringify(record)===values[0]}]:[];
      }
      if(sql.includes('FROM ready_source_fence'))return [{revision:String(fence),isolation:option.isolationLevel==='Serializable'?'serializable':'repeatable read',readonly:readOnly?'on':'off'}];
      if(sql.includes('worker_identity_lifecycle_guarded()'))return [{guarded}];
      if(sql.includes('FROM worker_identity_lifecycle l'))return records.filter(r=>r.intent.workspaceId===values[0]&&r.intent.kind===values[1]&&r.intent.subjectId===values[2]).map(record=>({record:copy(record),verified:verified&&audits.includes(record.id)}));
      if(sql.includes('FROM workspaces w')){
        const c=decisions.get(values[2]);return c?[{ownerId,decisionId:c.decisionId,decisionRevision:c.decisionRevision,intent:copy(c.intent),current,anchorFresh:fresh,hostEnabled:enabled}]:[];
      }
      assert.fail('unexpected query');
    }};
    options.push(option);
    try{const value=await work(db);
      if(!readOnly&&fault==='false_ack'){records=saved.records;audits=saved.audits;fence=saved.fence;return value;}
      if(!readOnly&&fault==='late_commit')await new Promise<void>(resolve=>setImmediate(resolve));
      if(!readOnly&&['commit','late_commit','connection_unknown'].includes(fault)||readOnly&&fault==='confirmation_commit')throw Error('synthetic-private-error');
      return value;
    }catch(e){if(fault!=='connection_unknown'){records=saved.records;audits=saved.audits;fence=saved.fence;}throw e;}finally{release();}
  }};
  const store=createPrismaWorkerIdentityLifecycleStore(client,()=>now);
  const intent=(kind:'host'|'installation',patch:Partial<LifecycleIntent>={}):LifecycleIntent=>({schemaVersion:'worker-identity-lifecycle-v1',workspaceId,kind,
    subjectId:kind==='host'?hostId:installationId,action:'adopt',expected:null,generation:kind==='host'?randomUUID():installationGeneration,
    installationId,installationGeneration,hostFingerprint:kind==='host'?hash('a'):null,authorityDigest:hash('b'),adoptionEvidenceDigest:hash('c'),expiresAt:'2026-09-23T13:00:00.000Z',...patch});
  const cmd=(i:LifecycleIntent)=>{const c={operationId:randomUUID(),decisionId:randomUUID(),decisionRevision:1,intent:i};decisions.set(c.decisionId,copy(c));return c;};
  const apply=(i:LifecycleIntent)=>store.apply(cmd(i));
  const next=(r:LifecycleRecord,patch:Partial<LifecycleIntent>):LifecycleIntent=>({...r.intent,expected:{id:r.id,epoch:r.epoch,generation:r.intent.generation},adoptionEvidenceDigest:null,...patch});
  const bind=(h:LifecycleRecord,i:LifecycleRecord)=>({workspaceId,hostId,installationId,hostEpoch:h.epoch,installationEpoch:i.epoch,hostFingerprint:h.intent.hostFingerprint!,ticketKeyId:'test',ticketKeyEpoch:1,ticketPublicKeyDigest:hash('d')});
  const pair=async()=>{const i=await apply(intent('installation'));const h=await apply(intent('host'));return {i,h,b:bind(h,i)};};
  return {client,store,intent,cmd,apply,next,bind,pair,calls,options,ownerId,records:()=>copy(records),state:()=>copy({records,audits,fence}),
    fault:(v:string)=>fault=v,guard:(v:boolean)=>guarded=v,fresh:(v:boolean)=>fresh=v,enabled:(v:boolean)=>enabled=v,current:(v:boolean)=>current=v,verified:(v:boolean)=>verified=v};
}

test('canonical identity lifecycle is source-only, prospective and fail closed',async t=>{
  let effects=0;const forbid=()=>{effects++;throw Error('external effect forbidden');};
  for(const m of ['connect','createConnection'] as const)t.mock.method(net,m,forbid);t.mock.method(net.Server.prototype,'listen',forbid);t.mock.method(tls,'connect',forbid);
  for(const module of [http,https])for(const m of ['request','get'] as const)t.mock.method(module,m,forbid);
  for(const m of ['lookup','resolve','resolve4','resolve6'] as const){t.mock.method(dns,m,forbid);t.mock.method(dns.promises,m,forbid);}
  t.mock.method(globalThis,'fetch',forbid);for(const m of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'] as const)t.mock.method(childProcess,m,forbid);
  const logs:unknown[]=[];for(const m of ['log','warn','error'] as const)t.mock.method(console,m,(...v:unknown[])=>logs.push(v));

  await t.test('legacy remains absent; create requires immutable transaction birth; adoption needs fresh explicit owner intent',async()=>{
    const f=fixture(),install=f.intent('installation',{action:'create',adoptionEvidenceDigest:null});
    await assert.rejects(f.apply(install));assert.equal(f.records().length,0);
    f.fresh(true);const created=await f.apply(install);assert.equal(created.epoch,1);
    const host=await f.apply(f.intent('host'));assert.equal(host.epoch,1);assert.notEqual(host.intent.generation,created.intent.generation);
    const g=fixture();await assert.rejects(g.apply(g.intent('installation',{adoptionEvidenceDigest:null})));
    g.current(false);await assert.rejects(g.apply(g.intent('installation')));assert.equal(g.records().length,0);
  });
  await t.test('monotonic update changes authority, revoke burns an epoch and cannot un-revoke',async()=>{
    const f=fixture(),{h}=await f.pair();const updated=await f.apply(f.next(h,{action:'update',authorityDigest:hash('e')}));assert.equal(updated.epoch,2);
    const revoked=await f.apply(f.next(updated,{action:'revoke'}));assert.equal(revoked.epoch,3);assert.equal(revoked.state,'revoked');
    await assert.rejects(f.apply(f.next(revoked,{action:'update',authorityDigest:hash('f')})));
    await assert.rejects(f.apply(f.next(revoked,{action:'revoke'})));assert.equal(f.records().at(-1)!.state,'revoked');
  });
  await t.test('new generation requires terminal predecessor, fresh identity and increasing epoch; ABA is denied',async()=>{
    const f=fixture(),{h,i,b}=await f.pair();await assert.rejects(f.apply(f.next(h,{action:'replace',generation:randomUUID(),hostFingerprint:hash('e')})));
    const revoked=await f.apply(f.next(h,{action:'revoke'}));
    await assert.rejects(f.apply(f.next(revoked,{action:'replace',generation:randomUUID()})));
    const replacement=await f.apply(f.next(revoked,{action:'replace',generation:randomUUID(),hostFingerprint:hash('e')}));assert.equal(replacement.epoch,3);
    assert.ok((await f.store.inspect(b)).blockers.includes('lifecycle_binding_mismatch'));
    assert.deepEqual((await f.store.inspect(f.bind(replacement,i))).blockers,[]);
    const terminal=await f.apply(f.next(replacement,{action:'revoke'}));
    await assert.rejects(f.apply(f.next(terminal,{action:'replace',generation:h.intent.generation,hostFingerprint:hash('f')})));
  });
  await t.test('installation epochs and revocation are independent and a replacement invalidates old host binding',async()=>{
    const f=fixture(),{h,i}=await f.pair();const revoked=await f.apply(f.next(i,{action:'revoke'}));
    assert.ok((await f.store.inspect(f.bind(h,revoked))).blockers.includes('installation_revoked'));
    const generation=randomUUID(),replacement=await f.apply(f.next(revoked,{action:'replace',generation,installationGeneration:generation}));
    assert.ok((await f.store.inspect(f.bind(h,replacement))).blockers.includes('lifecycle_binding_mismatch'));
    await assert.rejects(f.apply(f.next(h,{action:'update',authorityDigest:hash('e')})));
    const deadHost=await f.apply(f.next(h,{action:'revoke'}));
    const newHost=await f.apply(f.next(deadHost,{action:'replace',generation:randomUUID(),installationGeneration:generation,hostFingerprint:hash('e')}));
    assert.deepEqual((await f.store.inspect(f.bind(newHost,replacement))).blockers,[]);
  });
  await t.test('exact host/install identity and fingerprint reject mismatches and disabled anchors',async()=>{
    const f=fixture(),{h,i,b}=await f.pair();for(const patch of [{hostId:randomUUID()},{installationId:randomUUID()},{hostEpoch:2},{hostFingerprint:hash('e')}])assert.ok((await f.store.inspect({...b,...patch})).blockers.length>0);
    f.enabled(false);await assert.rejects(f.apply(f.next(h,{action:'update',authorityDigest:hash('e')})));
    assert.ok(projectLifecycle({...b,workspaceId:randomUUID()},[h,i],true).blockers.includes('lifecycle_binding_mismatch'));
  });
  await t.test('twenty concurrent writers have one CAS winner and stale or replayed decisions cannot append',async()=>{
    const f=fixture(),{h}=await f.pair(),i=f.next(h,{action:'update',authorityDigest:hash('e')}),c=f.cmd(i);
    const results=await Promise.allSettled(Array.from({length:20},()=>f.store.apply(c)));
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.records().filter(r=>r.intent.kind==='host').length,2);
    await assert.rejects(f.apply(f.next(h,{action:'revoke'})));
  });
  await t.test('state, history, audit, fence and commit failures roll back the whole transaction',async()=>{
    for(const failure of ['fence','state','history','audit','commit']){
      const f=fixture(),{h}=await f.pair(),before=f.state();f.fault(failure);
      await assert.rejects(f.apply(f.next(h,{action:'revoke'})),failure==='commit'?/reconciliation_required/:/worker_identity_lifecycle_blocked/);assert.deepEqual(f.state(),before,failure);
    }
  });
  await t.test('COMMIT rejection, delayed rejection and false acknowledgement never succeed or replay writes',async()=>{
    for(const failure of ['commit','late_commit','false_ack']){
      const f=fixture(),{h}=await f.pair(),before=f.state(),start=f.calls.length;f.fault(failure);
      await assert.rejects(f.apply(f.next(h,{action:'revoke'})),(e:any)=>e instanceof LifecycleReconciliationRequired&&e.code==='reconciliation_required'&&e.retryable===false);
      assert.deepEqual(f.state(),before,failure);
      assert.equal(f.calls.slice(start).filter(q=>q.startsWith('INSERT INTO worker_identity_lifecycle(')).length,1);
      assert.equal(f.calls.slice(start).filter(q=>q.includes('WHERE l.id=')).length,failure==='false_ack'?1:0);
    }
  });
  await t.test('lost commit response or unavailable/mismatched confirmation requires reconciliation even when the write committed',async()=>{
    for(const failure of ['connection_unknown','confirmation_read','confirmation_mismatch','confirmation_commit']){
      const f=fixture(),{h}=await f.pair(),start=f.calls.length;f.fault(failure);
      await assert.rejects(f.apply(f.next(h,{action:'revoke'})),LifecycleReconciliationRequired);
      assert.equal(f.records().at(-1)!.state,'revoked');assert.equal(f.records().at(-1)!.epoch,2);
      assert.equal(f.calls.slice(start).filter(q=>q.startsWith('INSERT INTO worker_identity_lifecycle(')).length,1);
      assert.equal(f.calls.slice(start).filter(q=>q.includes('WHERE l.id=')).length,failure==='connection_unknown'?0:1);
    }
  });
  await t.test('callback failure has no confirmation; normal success requires one separate read-only confirmation',async()=>{
    const f=fixture(),{h}=await f.pair();let start=f.calls.length;const before=f.state();f.fault('audit');
    await assert.rejects(f.apply(f.next(h,{action:'revoke'})),/worker_identity_lifecycle_blocked/);
    assert.deepEqual(f.state(),before);assert.equal(f.calls.slice(start).filter(q=>q.includes('WHERE l.id=')).length,0);
    f.fault('');start=f.calls.length;const result=await f.apply(f.next(h,{action:'revoke'}));
    assert.equal(result.state,'revoked');const calls=f.calls.slice(start),read=calls.indexOf('SET TRANSACTION READ ONLY');
    assert.ok(read>calls.findIndex(q=>q.startsWith('INSERT INTO worker_identity_lifecycle(')));
    assert.ok(calls.slice(read).every(q=>q.startsWith('SELECT')||q==='SET TRANSACTION READ ONLY'));
    assert.equal(calls.filter(q=>q.includes('WHERE l.id=')).length,1);assert.equal(f.options.at(-1).isolationLevel,'RepeatableRead');
  });
  await t.test('unfenced writer, missing audit, unaccepted decision and expired authority deny',async()=>{
    const f=fixture(),{h,b}=await f.pair();f.guard(false);
    assert.ok((await f.store.inspect(b)).blockers.includes('lifecycle_writer_unfenced'));await assert.rejects(f.apply(f.next(h,{action:'revoke'})));
    f.guard(true);f.verified(false);await assert.rejects(f.store.inspect(b));f.verified(true);f.current(false);
    await assert.rejects(f.apply(f.next(h,{action:'revoke'})));f.current(true);
    await assert.rejects(f.apply(f.next(h,{action:'revoke',expiresAt:'2000-01-01T00:00:00.000Z'})));
  });
  await t.test('inspect is read-only, never initializes legacy or repairs missing history',async()=>{
    const f=fixture(),{b}=await f.pair(),before=f.state(),start=f.calls.length;
    for(let n=0;n<3;n++)assert.deepEqual((await f.store.inspect(b)).blockers,[]);
    assert.deepEqual(f.state(),before);assert.ok(f.calls.slice(start).every(q=>q.startsWith('SELECT')||q==='SET TRANSACTION READ ONLY'));
    assert.equal(f.options.at(-1).isolationLevel,'RepeatableRead');
    const empty=fixture();assert.deepEqual((await empty.store.inspect(b)).blockers,[...lifecycleMissing]);assert.equal(empty.records().length,0);
  });
  await t.test('bootstrap removes only the four evidenced lifecycle gaps and still blocks on the other five',async()=>{
    const f=fixture(),{b}=await f.pair(),source=createCanonicalBootstrapAuthoritySource(()=>now);
    await f.client.$transaction(async(db:any)=>{
      await db.$executeRaw`SET TRANSACTION READ ONLY`;const release=await source.bindTransaction!(db,'read');
      try{await assert.rejects(source.context(db,b),(e:any)=>e instanceof CanonicalBootstrapBlocked&&
        JSON.stringify(e.blockers)===JSON.stringify(bootstrapAuthorityGaps.filter(g=>!lifecycleMissing.some(m=>m===g)).sort()));}finally{release();}
    },{isolationLevel:'RepeatableRead'});
  });
  await t.test('unknown input and secret-shaped fields are rejected and never logged or persisted',async()=>{
    const f=fixture(),i=f.intent('installation'),c=f.cmd(i);await assert.rejects(f.store.apply({...c,privateKey:'never-store-this'}));
    await assert.rejects(f.store.apply({...c,intent:{...i,metadata:{secret:'never-store-this'}}}));assert.equal(f.records().length,0);
  });
  await t.test('lifecycle decisions remain primary-owner reserved even with a forged delegated declaration',async()=>{
    const f=fixture(),state={ownerUserId:f.ownerId,ownerActive:true,truncated:false,mandates:[],workers:[],labels:[]};
    const result=await decisionAuthority({} as any,f.intent('installation').workspaceId,{workerIdentityLifecycle:f.intent('installation'),authority:{domain:'ordinary_domain'}},{},state);
    assert.equal(result.status,'owner_reserved');assert.equal(result.reason,'worker_identity_lifecycle');
  });
  await t.test('contract rejects missing history and does not infer old epochs',()=>{
    const f=fixture(),i=f.intent('installation'),a={ownerId:f.ownerId,decisionId:randomUUID(),decisionRevision:1,intent:i,current:true,anchorFresh:false,hostEnabled:true,writerFenced:true,installation:null};
    const first=advanceLifecycle(i,[],a,randomUUID(),now);assert.equal(first.epoch,1);
    const next=f.next(first,{action:'update',authorityDigest:hash('e')});
    assert.throws(()=>advanceLifecycle(next,[{...first,epoch:9}],{...a,intent:next},randomUUID(),now));
    assert.throws(()=>advanceLifecycle(next,[],{...a,intent:next},randomUUID(),now));
  });
  await t.test('unapplied schema guards every canonical anchor writer without seeding epochs or changing issuer policy',()=>{
    const sql=readFileSync('prisma/migrations/20260923210000_worker_identity_lifecycle/migration.sql','utf8');
    assert.match(sql,/lifecycle_host_anchor_guard BEFORE INSERT OR UPDATE OR DELETE ON agent_hosts/);
    assert.match(sql,/lifecycle_installation_anchor_guard BEFORE INSERT OR UPDATE OR DELETE ON trusted_provider_ticket_keys/);
    assert.match(sql,/lifecycle_birth_xid TEXT;/);assert.doesNotMatch(sql,/DEFAULT|CREATE OR REPLACE|UPDATE agent_hosts SET|UPDATE trusted_provider_ticket_keys SET/);
    assert.match(sql,/lifecycle_audit_append AFTER INSERT/);assert.match(sql,/lifecycle_history_no_truncate/);assert.match(sql,/t\.tgenabled='O'/);
    assert.match(sql,/NEW\.epoch::bigint<>p\.epoch::bigint\+1/);assert.match(sql,/p\.state<>'revoked'/);
  });
  assert.equal(effects,0);assert.deepEqual(logs,[]);
});
