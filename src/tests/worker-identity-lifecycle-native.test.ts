import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import net from 'node:net';
import tls from 'node:tls';
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import childProcess from 'node:child_process';
import { Prisma,PrismaClient } from '@prisma/client';
import { createPrismaWorkerIdentityLifecycleStore,inspectCanonicalLifecycle } from '../modules/api-keys/worker-identity-lifecycle-store';
import { lifecycleMissing,type LifecycleIntent,type LifecycleRecord } from '../modules/api-keys/worker-identity-lifecycle';
import { createCanonicalBootstrapAuthoritySource,bootstrapAuthorityGaps,CanonicalBootstrapBlocked } from '../modules/api-keys/worker-bootstrap-authority-source';
import { reviewDigest } from '../modules/agent-runtime/task-review-contract';

const enabled=process.env.WORKER_IDENTITY_NATIVE_DATABASE,hash=(s:string)=>s.repeat(64);
type Db=Prisma.TransactionClient;
test('Worker identity lifecycle native PostgreSQL qualification in one owned disposable database',{skip:!enabled,timeout:240000},async t=>{
  assert.match(enabled!,/^companycore_test_identity_[a-f0-9]{32}$/);
  const url=new URL(process.env.DATABASE_URL!);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.pathname,'/'+enabled);
  const db=new PrismaClient();await db.$connect();t.after(()=>db.$disconnect());
  const identity=await db.$queryRaw<any[]>`SELECT current_database() AS name,pg_get_userbyid(datdba) AS owner,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()`;
  assert.deepEqual(identity,[{name:enabled,owner:'companycore',marker:'worker-identity-native:'+enabled!.split('_').at(-1)}]);
  let effects=0;const forbid=()=>{effects++;throw Error('non-database effect forbidden');};
  for(const m of ['connect','createConnection'] as const)t.mock.method(net,m,forbid);t.mock.method(net.Server.prototype,'listen',forbid);t.mock.method(tls,'connect',forbid);
  for(const module of [http,https])for(const m of ['request','get'] as const)t.mock.method(module,m,forbid);
  for(const m of ['lookup','resolve','resolve4','resolve6'] as const){t.mock.method(dns,m,forbid);t.mock.method(dns.promises,m,forbid);}
  t.mock.method(globalThis,'fetch',forbid);for(const m of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'] as const)t.mock.method(childProcess,m,forbid);

  // Only governance/reference fixture preparation may bypass its independent
  // workflow. Every lifecycle/anchor/constraint operation is explicitly origin.
  async function prepare(work:(tx:Db)=>Promise<void>){await db.$transaction(async tx=>{await tx.$executeRaw`SET LOCAL session_replication_role=replica`;await work(tx);});}
  async function snapshot(){const values=[];for(const table of ['worker_identity_lifecycle','worker_identity_lifecycle_audit','ready_source_fence','agent_hosts','trusted_provider_ticket_keys','api_keys'])
    values.push(await db.$queryRawUnsafe(`SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb) AS value FROM "${table}" t`));return values;}
  async function rollbackProbe(work:(tx:Db)=>Promise<void>){const sentinel=Error('probe rollback');await assert.rejects(db.$transaction(async tx=>{await work(tx);throw sentinel;},{isolationLevel:'Serializable',timeout:30000}),e=>e===sentinel);}
  async function setup(legacy=true){
    const workspaceId=randomUUID(),ownerId=randomUUID(),hostId=randomUUID(),installationId=randomUUID(),installationGeneration=randomUUID(),slug=randomUUID();
    let before:((tx:Db)=>Promise<void>)|undefined,fault='';const modes:string[]=[];
    async function host(tx:Db){return tx.agentHost.create({data:{id:hostId,workspaceId,name:'Synthetic lifecycle host',slug,platform:'synthetic',status:'online'}});}
    async function installation(tx:Db){await tx.trustedProviderTicketKey.create({data:{workspaceId,installationId,keyId:'fixture',epoch:1,publicKeyDigest:hash('d')}});}
    await prepare(async tx=>{
      await tx.user.create({data:{id:ownerId,email:randomUUID()+'@example.test',passwordHash:'synthetic-not-a-login'}});
      await tx.workspace.create({data:{id:workspaceId,name:'Synthetic lifecycle qualification',ownerUserId:ownerId}});
      await tx.workspaceMembership.create({data:{workspaceId,userId:ownerId,role:'owner'}});
      if(legacy){await host(tx);await installation(tx);}
    });
    const wrapped=new Proxy(db,{get(target,key){if(key!=='$transaction')return Reflect.get(target,key);return (work:any,options:any)=>target.$transaction(async tx=>{
      assert.equal((await tx.$queryRaw<any[]>`SHOW session_replication_role`)[0].session_replication_role,'origin');
      if(before){const hook=before;before=undefined;await hook(tx);}
      const proxy=new Proxy(tx,{get(target,key){const value=Reflect.get(target,key);if(key==='$executeRaw')return async(...args:any[])=>{
        const result=await (value as any).apply(target,args),sql=args[0].join('?');
        if(sql==='SET TRANSACTION READ ONLY')modes.push((await tx.$queryRaw<any[]>`SHOW transaction_read_only`)[0].transaction_read_only);
        if(fault==='fence'&&sql.startsWith('UPDATE ready_source_fence')||fault==='append'&&sql.startsWith('INSERT INTO worker_identity_lifecycle('))throw Error('synthetic rollback');return result;
      };return typeof value==='function'?value.bind(target):value;}});
      const result=await work(proxy);if(fault==='precommit')throw Error('synthetic rollback');return result;
    },{...options,maxWait:15000,timeout:30000});}});
    const store=createPrismaWorkerIdentityLifecycleStore(wrapped);
    const intent=(kind:'host'|'installation',patch:Partial<LifecycleIntent>={}):LifecycleIntent=>({schemaVersion:'worker-identity-lifecycle-v1',workspaceId,kind,
      subjectId:kind==='host'?hostId:installationId,action:'adopt',expected:null,generation:kind==='host'?randomUUID():installationGeneration,installationId,installationGeneration,
      hostFingerprint:kind==='host'?hash('a'):null,authorityDigest:hash('b'),adoptionEvidenceDigest:hash('c'),expiresAt:new Date(Date.now()+600000).toISOString(),...patch});
    async function command(i:LifecycleIntent){const c={operationId:randomUUID(),decisionId:randomUUID(),decisionRevision:1,intent:i},preview=randomUUID();await prepare(async tx=>{
      await tx.decision.create({data:{id:c.decisionId,workspaceId,title:'Synthetic exact lifecycle acceptance',status:'accepted',source:'synthetic_native_fixture'}});
      await tx.$executeRaw`INSERT INTO decision_revisions(decision_id,workspace_id,version,body,actor_user_id,request_id,request_hash)
        VALUES(${c.decisionId}::uuid,${workspaceId}::uuid,1,${JSON.stringify({workerIdentityLifecycle:i})}::jsonb,${ownerId}::uuid,${randomUUID()}::uuid,${reviewDigest(i)})`;
      await tx.$executeRaw`INSERT INTO decision_impact_previews(id,decision_id,workspace_id,version,impact,actor_user_id,request_id,request_hash)
        VALUES(${preview}::uuid,${c.decisionId}::uuid,${workspaceId}::uuid,1,'{}'::jsonb,${ownerId}::uuid,${randomUUID()}::uuid,${reviewDigest(i)})`;
      await tx.$executeRaw`INSERT INTO decision_acceptances(id,decision_id,workspace_id,preview_id,actor_user_id,request_id,request_hash,authority)
        VALUES(${randomUUID()}::uuid,${c.decisionId}::uuid,${workspaceId}::uuid,${preview}::uuid,${ownerId}::uuid,${randomUUID()}::uuid,${reviewDigest(i)},'{"status":"owner_reserved"}'::jsonb)`;
    });return c;}
    const apply=async(i:LifecycleIntent)=>store.apply(await command(i));
    const next=(r:LifecycleRecord,patch:Partial<LifecycleIntent>):LifecycleIntent=>({...r.intent,expected:{id:r.id,epoch:r.epoch,generation:r.intent.generation},adoptionEvidenceDigest:null,...patch});
    const binding=(h:LifecycleRecord,i:LifecycleRecord)=>({workspaceId,hostId,installationId,hostEpoch:h.epoch,installationEpoch:i.epoch,hostFingerprint:h.intent.hostFingerprint!,ticketKeyId:'fixture',ticketKeyEpoch:1,ticketPublicKeyDigest:hash('d')});
    const pair=async()=>{const i=await apply(intent('installation')),h=await apply(intent('host'));return {i,h,b:binding(h,i)};};
    async function direct(c:Awaited<ReturnType<typeof command>>,old:LifecycleRecord|null,state='active'){
      const i=c.intent,r={id:c.operationId,intent:i,epoch:(old?.epoch??0)+1,state,ownerId,decisionId:c.decisionId,decisionRevision:1,previousId:old?.id??null};
      return db.$transaction(tx=>tx.$executeRaw`INSERT INTO worker_identity_lifecycle(id,workspace_id,kind,subject_id,epoch,generation,state,previous_id,decision_id,record,record_digest)
        VALUES(${r.id}::uuid,${workspaceId}::uuid,${i.kind},${i.subjectId}::uuid,${r.epoch},${i.generation}::uuid,${state},${r.previousId}::uuid,${c.decisionId}::uuid,${JSON.stringify(r)}::jsonb,${hash('0')})`,{isolationLevel:'Serializable'});
    }
    return {workspaceId,ownerId,hostId,installationId,slug,store,intent,command,apply,next,binding,pair,direct,host,installation,modes,
      before:(hook:(tx:Db)=>Promise<void>)=>before=hook,fault:(value:string)=>fault=value};
  }

  await t.test('native legacy stays blocked, explicit owner adoption and same-transaction create establish independent epochs',async()=>{
    const legacy=await setup(),initial={workspaceId:legacy.workspaceId,hostId:legacy.hostId,installationId:legacy.installationId,hostEpoch:1,installationEpoch:1,hostFingerprint:hash('a'),ticketKeyId:'fixture',ticketKeyEpoch:1,ticketPublicKeyDigest:hash('d')};
    assert.deepEqual((await legacy.store.inspect(initial)).blockers,[...lifecycleMissing]);
    const fake=await legacy.command(legacy.intent('installation',{action:'create',adoptionEvidenceDigest:null}));await assert.rejects(legacy.store.apply(fake));await assert.rejects(legacy.direct(fake,null));
    const {h,i,b}=await legacy.pair();assert.equal(h.epoch,1);assert.equal(i.epoch,1);assert.notEqual(h.intent.generation,i.intent.generation);assert.deepEqual((await legacy.store.inspect(b)).blockers,[]);
    const fresh=await setup(false),ic=await fresh.command(fresh.intent('installation',{action:'create',adoptionEvidenceDigest:null}));fresh.before(fresh.installation);const ci=await fresh.store.apply(ic);
    const hc=await fresh.command(fresh.intent('host',{action:'create',adoptionEvidenceDigest:null}));fresh.before(async tx=>{await fresh.host(tx);});const ch=await fresh.store.apply(hc);
    assert.deepEqual((await fresh.store.inspect(fresh.binding(ch,ci))).blockers,[]);
  });
  await t.test('real monotonic updates, immutable history, terminal revoke and fresh replacement reject ABA and un-revoke',async()=>{
    const f=await setup(),{h,i,b}=await f.pair(),u=await f.apply(f.next(h,{action:'update',authorityDigest:hash('e')})),r=await f.apply(f.next(u,{action:'revoke'}));
    assert.equal(r.epoch,3);assert.ok((await f.store.inspect(f.binding(r,i))).blockers.includes('host_revoked'));
    const invalid=await f.command(f.next(r,{action:'update',authorityDigest:hash('f')}));await assert.rejects(f.store.apply(invalid));await assert.rejects(f.direct(invalid,r));
    await assert.rejects(db.$executeRaw`UPDATE worker_identity_lifecycle SET state='active' WHERE id=${r.id}::uuid`);
    await assert.rejects(db.$executeRaw`DELETE FROM worker_identity_lifecycle WHERE id=${r.id}::uuid`);
    const replacement=await f.apply(f.next(r,{action:'replace',generation:randomUUID(),hostFingerprint:hash('f')}));assert.equal(replacement.epoch,4);
    assert.ok((await f.store.inspect(b)).blockers.includes('lifecycle_binding_mismatch'));
    const revoked=await f.apply(f.next(replacement,{action:'revoke'}));const aba=await f.command(f.next(revoked,{action:'replace',generation:h.intent.generation,hostFingerprint:hash('1')}));await assert.rejects(f.direct(aba,revoked));
    const history=await db.$queryRaw<any[]>`SELECT epoch,state FROM worker_identity_lifecycle WHERE workspace_id=${f.workspaceId}::uuid AND kind='host' ORDER BY epoch`;
    assert.deepEqual(history.map(x=>x.epoch),[1,2,3,4,5]);assert.equal(history[2].state,'revoked');
  });
  await t.test('native adoption guard rejects wrong/current owner, ambiguous membership and expired acceptance intent',async()=>{
    for(const mode of ['actor','owner','ambiguous','expired']){
      const f=await setup(),other=randomUUID(),c=await f.command(f.intent('installation',mode==='expired'?{expiresAt:'2000-01-01T00:00:00.000Z'}:{}));
      if(mode!=='expired')await prepare(async tx=>{
        await tx.user.create({data:{id:other,email:other+'@example.test',passwordHash:'synthetic-not-a-login'}});
        if(mode==='actor')await tx.$executeRaw`UPDATE decision_acceptances SET actor_user_id=${other}::uuid WHERE decision_id=${c.decisionId}::uuid`;
        if(mode==='owner')await tx.workspace.update({where:{id:f.workspaceId},data:{ownerUserId:other}});
        if(mode==='ambiguous')await tx.workspaceMembership.create({data:{workspaceId:f.workspaceId,userId:other,role:'owner'}});
      });
      const before=await snapshot();await assert.rejects(f.store.apply(c));await assert.rejects(f.direct(c,null));assert.deepEqual(await snapshot(),before);
    }
  });
  await t.test('installation revoke/replacement independently invalidates exact host binding and requires fresh host generation',async()=>{
    const f=await setup(),{h,i}=await f.pair(),r=await f.apply(f.next(i,{action:'revoke'}));assert.ok((await f.store.inspect(f.binding(h,r))).blockers.includes('installation_revoked'));
    const generation=randomUUID(),replacement=await f.apply(f.next(r,{action:'replace',generation,installationGeneration:generation}));assert.equal(replacement.epoch,3);
    assert.ok((await f.store.inspect(f.binding(h,replacement))).blockers.includes('lifecycle_binding_mismatch'));
    await assert.rejects(f.apply(f.next(h,{action:'update',authorityDigest:hash('e')})));
    const hr=await f.apply(f.next(h,{action:'revoke'})),newHost=await f.apply(f.next(hr,{action:'replace',generation:randomUUID(),installationGeneration:generation,hostFingerprint:hash('e')}));
    assert.deepEqual((await f.store.inspect(f.binding(newHost,replacement))).blockers,[]);
    for(const patch of [{hostId:randomUUID()},{installationId:randomUUID()},{hostFingerprint:hash('f')},{hostEpoch:1}])assert.ok((await f.store.inspect({...f.binding(newHost,replacement),...patch})).blockers.length>0);
  });
  await t.test('twenty native concurrent writers admit one exact predecessor and replay never advances the epoch',async()=>{
    const f=await setup(),{h}=await f.pair(),commands=[];for(let n=0;n<20;n++)commands.push(await f.command(f.next(h,{action:'update',authorityDigest:reviewDigest(n)})));
    const results=await Promise.allSettled(commands.map(c=>f.store.apply(c)));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    const before=await snapshot();await assert.rejects(f.store.apply(commands[results.findIndex(r=>r.status==='fulfilled')]));assert.deepEqual(await snapshot(),before);
  });
  await t.test('real rollback covers fence, state/history, automatic audit and deferred commit failure',async()=>{
    await db.$executeRawUnsafe("CREATE OR REPLACE FUNCTION native_lifecycle_fail() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic rollback'; END $$");
    for(const fault of ['fence','append','precommit','history','audit','commit']){
      const f=await setup(),{h}=await f.pair(),c=await f.command(f.next(h,{action:'revoke'})),before=await snapshot();
      if(['fence','append','precommit'].includes(fault))f.fault(fault);
      else f.before(async tx=>{if(fault==='commit')await tx.$executeRawUnsafe('CREATE CONSTRAINT TRIGGER native_commit_failure AFTER INSERT ON worker_identity_lifecycle DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION native_lifecycle_fail()');
        else await tx.$executeRawUnsafe(fault==='history'?'CREATE TRIGGER a_native_history_failure AFTER INSERT ON worker_identity_lifecycle FOR EACH ROW EXECUTE FUNCTION native_lifecycle_fail()':'CREATE TRIGGER native_audit_failure AFTER INSERT ON worker_identity_lifecycle_audit FOR EACH ROW EXECUTE FUNCTION native_lifecycle_fail()');});
      if(fault==='commit'){
        const outcome=await f.store.apply(c).then(()=>({reportedSuccess:true}),()=>({reportedSuccess:false}));
        assert.deepEqual(await snapshot(),before,'PostgreSQL must roll back the deferred commit failure');
        assert.equal(outcome.reportedSuccess,false,'Adapter reported success although PostgreSQL rolled back COMMIT');
      }else{await assert.rejects(f.store.apply(c),fault);assert.deepEqual(await snapshot(),before,fault);}
    }
  });
  await t.test('actual register/upsert, heartbeat/claim shapes fence writes and cannot mutate or delete adopted authority',async()=>{
    const f=await setup(),{h,i}=await f.pair(),before=(await db.$queryRaw<any[]>`SELECT revision::text AS n FROM ready_source_fence WHERE id=1`)[0].n;
    await db.agentHost.upsert({where:{workspaceId_slug:{workspaceId:f.workspaceId,slug:f.slug}},create:{workspaceId:f.workspaceId,slug:f.slug,name:'Synthetic lifecycle host',platform:'synthetic'},update:{name:'Synthetic lifecycle host',platform:'synthetic',status:'online',lastSeenAt:new Date()}});
    await db.agentHost.update({where:{id:f.hostId},data:{status:'offline',lastSeenAt:new Date()}});await db.agentHost.update({where:{id:f.hostId},data:{status:'online',lastSeenAt:new Date()}});
    assert.ok(BigInt((await db.$queryRaw<any[]>`SELECT revision::text AS n FROM ready_source_fence WHERE id=1`)[0].n)>BigInt(before));
    for(const data of [{id:randomUUID()},{workspaceId:randomUUID()},{platform:'other'},{capabilities:['other']},{applicationSlugs:['other']},{metadata:{authority:'other'}},{status:'disabled' as const}])await assert.rejects(db.agentHost.update({where:{id:f.hostId},data}));
    await assert.rejects(db.agentHost.delete({where:{id:f.hostId}}));await assert.rejects(f.host(db));
    await assert.rejects(db.$executeRaw`UPDATE agent_hosts SET lifecycle_birth_xid=pg_current_xact_id()::text WHERE id=${f.hostId}::uuid`);
    assert.deepEqual((await f.store.inspect(f.binding(h,i))).blockers,[]);
    const legacy=await setup();await assert.rejects(db.agentHost.delete({where:{id:legacy.hostId}}));
  });
  await t.test('installation/key guards preserve identity while the existing credential invalidation trigger remains effective',async()=>{
    const f=await setup(),{h,i}=await f.pair();
    await db.trustedProviderTicketKey.update({where:{workspaceId:f.workspaceId},data:{keyId:'rotated',epoch:2,publicKeyDigest:hash('e')}});
    await assert.rejects(db.trustedProviderTicketKey.update({where:{workspaceId:f.workspaceId},data:{installationId:randomUUID(),keyId:'other',epoch:3,publicKeyDigest:hash('f')}}));
    await assert.rejects(db.trustedProviderTicketKey.delete({where:{workspaceId:f.workspaceId}}));assert.deepEqual((await f.store.inspect(f.binding(h,i))).blockers,[]);
    const legacy=await setup(),credential=randomUUID();await prepare(async tx=>{await tx.apiKey.create({data:{id:credential,workspaceId:legacy.workspaceId,name:'Inert synthetic credential reference',keyHash:reviewDigest(credential),keyPrefix:'synthetic',active:true,scopes:['agent-runtime:claim'],workerHostId:legacy.hostId,workerInstallationId:legacy.installationId,workerBindingEpoch:1,credentialVersion:1,expiresAt:new Date(Date.now()+600000)}});});
    await db.agentHost.update({where:{id:legacy.hostId},data:{status:'disabled'}});const row=await db.apiKey.findUniqueOrThrow({where:{id:credential},select:{active:true,revokedAt:true}});assert.equal(row.active,false);assert.ok(row.revokedAt);
  });
  await t.test('shared native writer fence blocks a real host writer until the holder releases',async()=>{
    const f=await setup();await f.pair();let release!:()=>void,locked!:()=>void;const gate=new Promise<void>(r=>release=r),held=new Promise<void>(r=>locked=r);
    const holder=db.$transaction(async tx=>{await tx.$executeRaw`UPDATE ready_source_fence SET revision=revision+1 WHERE id=1`;locked();await gate;},{timeout:30000});await held;
    let completed=false;const writer=db.agentHost.update({where:{id:f.hostId},data:{lastSeenAt:new Date()}}).then(()=>{completed=true;});
    try{let waiting=0;for(let n=0;n<20&&!waiting;n++){await new Promise(r=>setTimeout(r,25));waiting=(await db.$queryRaw<any[]>`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'`)[0].n;}
      assert.ok(waiting>0);assert.equal(completed,false);}finally{release();await holder;await writer;}assert.equal(completed,true);
  });
  await t.test('missing, disabled and rebound guard/function bindings and replica mode fail closed',async()=>{
    const f=await setup(),{b}=await f.pair();await db.$executeRawUnsafe('CREATE OR REPLACE FUNCTION native_lifecycle_noop() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$');
    const guards=[['worker_identity_lifecycle','lifecycle_append_guard'],['worker_identity_lifecycle','lifecycle_history_immutable'],['worker_identity_lifecycle','lifecycle_history_no_truncate'],['worker_identity_lifecycle','lifecycle_audit_append'],
      ['worker_identity_lifecycle_audit','lifecycle_audit_immutable'],['agent_hosts','lifecycle_host_anchor_guard'],['agent_hosts','lifecycle_host_no_truncate'],['trusted_provider_ticket_keys','lifecycle_installation_anchor_guard'],['trusted_provider_ticket_keys','lifecycle_installation_no_truncate']];
    for(const ddl of [...guards.map(([table,guard])=>`ALTER TABLE ${table} DISABLE TRIGGER ${guard}`),'DROP TRIGGER lifecycle_installation_anchor_guard ON trusted_provider_ticket_keys','SET LOCAL session_replication_role=replica'])
      await rollbackProbe(async tx=>{await tx.$executeRawUnsafe(ddl);assert.ok((await inspectCanonicalLifecycle(tx,b)).blockers.includes('lifecycle_writer_unfenced'));});
    await rollbackProbe(async tx=>{await tx.$executeRawUnsafe('DROP TRIGGER lifecycle_host_anchor_guard ON agent_hosts');await tx.$executeRawUnsafe('CREATE TRIGGER lifecycle_host_anchor_guard BEFORE INSERT OR UPDATE OR DELETE ON agent_hosts FOR EACH ROW EXECUTE FUNCTION native_lifecycle_noop()');assert.ok((await inspectCanonicalLifecycle(tx,b)).blockers.includes('lifecycle_writer_unfenced'));});
    assert.deepEqual((await f.store.inspect(b)).blockers,[]);
  });
  await t.test('incomplete history/audit and SQL READ ONLY reject writes without silently repairing state',async()=>{
    const f=await setup(),{h,b}=await f.pair(),before=await snapshot();for(let n=0;n<3;n++)assert.deepEqual((await f.store.inspect(b)).blockers,[]);
    assert.deepEqual(await snapshot(),before);assert.deepEqual(f.modes,['on','on','on']);
    await assert.rejects(db.$transaction(async tx=>{await tx.$executeRaw`SET TRANSACTION READ ONLY`;await tx.$executeRaw`UPDATE ready_source_fence SET revision=revision+1 WHERE id=1`;},{isolationLevel:'RepeatableRead'}));
    await rollbackProbe(async tx=>{await tx.$executeRaw`SET LOCAL session_replication_role=replica`;await tx.$executeRaw`DELETE FROM worker_identity_lifecycle_audit WHERE operation_id=${h.id}::uuid`;await tx.$executeRaw`SET LOCAL session_replication_role=origin`;await assert.rejects(inspectCanonicalLifecycle(tx,b));});
    await rollbackProbe(async tx=>{await tx.$executeRaw`SET LOCAL session_replication_role=replica`;await tx.$executeRaw`DELETE FROM worker_identity_lifecycle_audit WHERE operation_id=${h.id}::uuid`;await tx.$executeRaw`DELETE FROM worker_identity_lifecycle WHERE id=${h.id}::uuid`;await tx.$executeRaw`SET LOCAL session_replication_role=origin`;assert.deepEqual((await inspectCanonicalLifecycle(tx,b)).blockers,[...lifecycleMissing]);});
    assert.deepEqual(await snapshot(),before);
  });
  await t.test('canonical BootstrapAuthoritySource clears only four evidenced facts and keeps all other authority blocked',async()=>{
    const f=await setup(),{b}=await f.pair(),source=createCanonicalBootstrapAuthoritySource();await db.$transaction(async tx=>{
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;const release=await source.bindTransaction!(tx,'read');try{await assert.rejects(source.context(tx,b),(e:any)=>e instanceof CanonicalBootstrapBlocked&&JSON.stringify(e.blockers)===JSON.stringify(bootstrapAuthorityGaps.filter(g=>!lifecycleMissing.some(m=>m===g)).sort()));}finally{release();}
    },{isolationLevel:'RepeatableRead'});
    const publicRows=await db.$queryRaw<any[]>`SELECT record FROM worker_identity_lifecycle WHERE workspace_id=${f.workspaceId}::uuid`;
    const serialized=JSON.stringify(publicRows);for(const forbidden of ['passwordHash','keyHash','PRIVATE KEY','deviceProof','credentialSecret'])assert.ok(!serialized.includes(forbidden));
  });
  assert.equal(effects,0);
});
