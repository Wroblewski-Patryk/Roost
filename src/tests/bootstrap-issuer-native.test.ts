import test from 'node:test';
import assert from 'node:assert/strict';
import crypto,{createHash,randomUUID} from 'node:crypto';
import net from 'node:net';import tls from 'node:tls';import http from 'node:http';import https from 'node:https';import dns from 'node:dns';import childProcess from 'node:child_process';
import {Prisma,PrismaClient} from '@prisma/client';
import {issuerMaterial,issuerGaps,type IssuerIntent} from '../modules/api-keys/bootstrap-issuer-contract';
import {issuerGuards} from '../modules/api-keys/bootstrap-issuer-guards';
import {createPrismaBootstrapIssuerStore,inspectCanonicalIssuer,IssuerReconciliationRequired} from '../modules/api-keys/bootstrap-issuer-store';
import {createCanonicalBootstrapAuthoritySource,CanonicalBootstrapBlocked} from '../modules/api-keys/worker-bootstrap-authority-source';
import {createPrismaWorkerIdentityLifecycleStore} from '../modules/api-keys/worker-identity-lifecycle-store';
import {createPrismaOwnerTicketStore} from '../modules/agent-runtime/owner-ticket-store';
import {reviewDigest} from '../modules/agent-runtime/task-review-contract';
type Db=Prisma.TransactionClient;
const enabled=process.env.WORKER_IDENTITY_NATIVE_DATABASE,hash=(s:string)=>s.repeat(64);
// Public points only, identical to the source qualification; no signing fixture.
const materials=['d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a','3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c','fc51cd8e6218a1a38da47ed00230f0580816ed13ba3303ac5deb911548908025'].map((point,n)=>{
  const der=Buffer.from('302a300506032b6570032100'+point,'hex');return issuerMaterial.parse({keyId:'native-public-'+n,algorithm:'Ed25519',format:'spki-der-base64',spki:der.toString('base64'),publicKeyDigest:createHash('sha256').update(der).digest('hex')});
});
test('canonical public bootstrap issuer native qualification in one owned disposable database',{skip:!enabled,timeout:240000},async t=>{
  assert.match(enabled!,/^companycore_test_identity_[a-f0-9]{32}$/);assert.equal(process.env.WORKER_IDENTITY_NATIVE_FAULT_RELAY,'1');
  const url=new URL(process.env.DATABASE_URL!);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.pathname,'/'+enabled);
  const db=new PrismaClient();await db.$connect();t.after(()=>db.$disconnect());
  assert.deepEqual(await db.$queryRaw<any[]>`SELECT current_database() AS name,pg_get_userbyid(datdba) AS owner,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()`,
    [{name:enabled,owner:'companycore',marker:'worker-identity-native:'+enabled!.split('_').at(-1)}]);
  let effects=0;const forbid=()=>{effects++;throw Error('non-database effect forbidden');};
  for(const m of ['connect','createConnection'] as const)t.mock.method(net,m,forbid);t.mock.method(net.Server.prototype,'listen',forbid);t.mock.method(tls,'connect',forbid);
  for(const module of [http,https])for(const m of ['request','get'] as const)t.mock.method(module,m,forbid);
  for(const m of ['lookup','resolve','resolve4','resolve6'] as const){t.mock.method(dns,m,forbid);t.mock.method(dns.promises,m,forbid);}
  t.mock.method(globalThis,'fetch',forbid);for(const m of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'] as const)t.mock.method(childProcess,m,forbid);
  for(const m of ['generateKeyPair','generateKeyPairSync','createPrivateKey','sign'] as const)t.mock.method(crypto,m,forbid);
  const logs:unknown[]=[];for(const m of ['log','warn','error'] as const)t.mock.method(console,m,(...v:unknown[])=>logs.push(v));
  // Only inert governance fixtures use replica. Every issuer/anchor operation
  // below uses origin. Clock injection tests boundaries without waiting minutes.
  async function prepare(work:(tx:Db)=>Promise<void>){await db.$transaction(async tx=>{await tx.$executeRaw`SET LOCAL session_replication_role=replica`;await work(tx);});}
  async function snapshot(){const rows=[];for(const table of ['trusted_provider_ticket_keys','bootstrap_issuer_history','bootstrap_issuer_audit','ready_source_fence','trusted_provider_tickets','trusted_provider_ticket_journal','events'])
    rows.push(await db.$queryRawUnsafe(`SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb) AS value FROM "${table}" t`));return rows;}
  async function probe(work:(tx:Db)=>Promise<void>){const stop=Error('owned rollback');await assert.rejects(db.$transaction(async tx=>{await work(tx);throw stop;},{isolationLevel:'Serializable',timeout:30000}),e=>e===stop);}
  async function setup(legacy=true){
    const workspaceId=randomUUID(),ownerId=randomUUID(),installationId=randomUUID(),hostId=randomUUID(),binding={workspaceId,issuerId:workspaceId,installationId,purpose:'worker-bootstrap-owner-ticket-v1' as const};
    const base=Date.now()-60000;let clock=base,revision=0,highWater=1,before:((tx:Db)=>Promise<void>)|undefined,fault='';
    const attempts={writes:0,appends:0,reads:0},modes:string[]=[];
    await prepare(async tx=>{await tx.user.create({data:{id:ownerId,email:randomUUID()+'@example.test',passwordHash:'synthetic-not-a-login'}});
      await tx.workspace.create({data:{id:workspaceId,name:'Synthetic public issuer qualification',ownerUserId:ownerId}});
      await tx.workspaceMembership.create({data:{workspaceId,userId:ownerId,role:'owner'}});
      await tx.agentHost.create({data:{id:hostId,workspaceId,name:'Inert synthetic host',slug:randomUUID(),platform:'synthetic',status:'online'}});
    });
    const insertAnchor=()=>db.trustedProviderTicketKey.create({data:{workspaceId,installationId,keyId:materials[0].keyId,epoch:1,publicKeyDigest:materials[0].publicKeyDigest}});
    if(legacy)await insertAnchor();
    async function accept(body:any){const decisionId=randomUUID(),preview=randomUUID();await prepare(async tx=>{
      await tx.decision.create({data:{id:decisionId,workspaceId,title:'Exact synthetic owner acceptance',status:'accepted',source:'synthetic_native_fixture'}});
      await tx.$executeRaw`INSERT INTO decision_revisions(decision_id,workspace_id,version,body,actor_user_id,request_id,request_hash)
        VALUES(${decisionId}::uuid,${workspaceId}::uuid,1,${JSON.stringify(body)}::jsonb,${ownerId}::uuid,${randomUUID()}::uuid,${reviewDigest(body)})`;
      await tx.$executeRaw`INSERT INTO decision_impact_previews(id,decision_id,workspace_id,version,impact,actor_user_id,request_id,request_hash)
        VALUES(${preview}::uuid,${decisionId}::uuid,${workspaceId}::uuid,1,'{}'::jsonb,${ownerId}::uuid,${randomUUID()}::uuid,${reviewDigest(body)})`;
      await tx.$executeRaw`INSERT INTO decision_acceptances(id,decision_id,workspace_id,preview_id,actor_user_id,request_id,request_hash,authority,created_at)
        VALUES(${randomUUID()}::uuid,${decisionId}::uuid,${workspaceId}::uuid,${preview}::uuid,${ownerId}::uuid,${randomUUID()}::uuid,${reviewDigest(body)},'{"status":"owner_reserved"}'::jsonb,${new Date(base-1000)})`;
    });return decisionId;}
    const client=new Proxy(db,{get(target,key){if(key!=='$transaction')return Reflect.get(target,key);return (work:any,options:any)=>target.$transaction(async tx=>{
      if(options.isolationLevel==='Serializable')attempts.writes++;else attempts.reads++;
      assert.equal((await tx.$queryRaw<any[]>`SHOW session_replication_role`)[0].session_replication_role,'origin');
      if(before){const hook=before;before=undefined;await hook(tx);}
      const proxy=new Proxy(tx,{get(target,key){const value=Reflect.get(target,key);if(key==='$executeRaw')return async(...args:any[])=>{
        const sql=args[0].join('?');if(sql.startsWith('INSERT INTO bootstrap_issuer_history'))attempts.appends++;
        const result=await (value as any).apply(target,args);
        if(sql==='SET TRANSACTION READ ONLY')modes.push((await tx.$queryRaw<any[]>`SHOW transaction_read_only`)[0].transaction_read_only);
        if(fault==='fence'&&sql.startsWith('UPDATE ready_source_fence')||fault==='append'&&sql.startsWith('INSERT INTO bootstrap_issuer_history')||fault==='create'&&sql.startsWith('INSERT INTO trusted_provider_ticket_keys'))throw Error('synthetic write rejection');
        return result;
      };return typeof value==='function'?value.bind(target):value;}});
      const result=await work(proxy);if(fault==='precommit')throw Error('synthetic precommit rejection');
      if(fault==='connection'&&options.isolationLevel==='Serializable'){
        const pid=(await tx.$queryRaw<any[]>`SELECT pg_backend_pid() AS pid`)[0].pid;
        assert.deepEqual(await db.$queryRaw<any[]>`SELECT pg_terminate_backend(pid) AS terminated FROM pg_stat_activity WHERE pid=${pid} AND datname=current_database() AND pid<>pg_backend_pid()`,[{terminated:true}]);
      }
      return result;
    },{...options,maxWait:15000,timeout:15000});}});
    const store=createPrismaBootstrapIssuerStore(client,()=>new Date(clock));
    const intent=(action:IssuerIntent['action'],patch:Partial<IssuerIntent>={}):IssuerIntent=>({schemaVersion:'bootstrap-issuer-v1',binding,action,expectedRevision:revision,targetEpoch:action==='stage'?highWater+1:highWater,
      material:action==='stage'?materials[1]:['create','adopt'].includes(action)?materials[0]:null,activatesAt:action==='stage'?new Date(clock+1000).toISOString():null,
      cutoverAt:action==='stage'?new Date(clock+10000).toISOString():null,adoptionEvidenceDigest:action==='adopt'?hash('c'):null,expiresAt:new Date(Date.now()+600000).toISOString(),...patch});
    const command=async(i:IssuerIntent)=>({operationId:randomUUID(),decisionId:await accept({workerBootstrapIssuer:i}),decisionRevision:1,intent:i});
    const apply=async(i:IssuerIntent)=>{const r=await store.apply(await command(i));revision=r.revision;highWater=Math.max(highWater,i.targetEpoch);return r;};
    const bind=(n=0,epoch=1)=>({workspaceId,hostId,installationId,hostEpoch:1,installationEpoch:1,hostFingerprint:hash('a'),ticketKeyId:materials[n].keyId,ticketKeyEpoch:epoch,ticketPublicKeyDigest:materials[n].publicKeyDigest});
    const direct=async(c:Awaited<ReturnType<typeof command>>,recordPatch:any={})=>{const last=(await db.$queryRaw<any[]>`SELECT id FROM bootstrap_issuer_history WHERE workspace_id=${workspaceId}::uuid ORDER BY revision DESC LIMIT 1`)[0];
      const r={id:c.operationId,revision:c.intent.expectedRevision+1,previousId:last?.id??null,decisionId:c.decisionId,decisionRevision:1,ownerId,at:new Date(clock).toISOString(),intent:c.intent,...recordPatch};
      return db.$transaction(tx=>tx.$executeRaw`INSERT INTO bootstrap_issuer_history(id,workspace_id,revision,decision_id,record,record_digest,writer_xid)
        VALUES(${c.operationId}::uuid,${workspaceId}::uuid,${r.revision},${c.decisionId}::uuid,${JSON.stringify(r)}::jsonb,${hash('0')},'')`,{isolationLevel:'Serializable'});};
    return {workspaceId,ownerId,installationId,hostId,store,client,intent,command,apply,bind,direct,accept,insertAnchor,attempts,modes,
      iso:(ms=0)=>new Date(base+ms).toISOString(),now:()=>new Date(clock),at:(ms:number)=>clock=base+ms,before:(hook:(tx:Db)=>Promise<void>)=>before=hook,fault:(v:string)=>fault=v};
  }

  await t.test('public material shape and digest are enforced on native direct SQL without private material',async()=>{
    const f=await setup();
    for(const patch of [{algorithm:'RSA'},{format:'pem'},{spki:materials[0].spki+'\n'},{publicKeyDigest:hash('e')},{privateKey:'forbidden-field'}]){
      const i=f.intent('adopt',{material:{...materials[0],...patch} as any}),c=await f.command(i),before=await snapshot();await assert.rejects(f.direct(c));assert.deepEqual(await snapshot(),before);
    }
    await f.apply(f.intent('adopt'));const r=await f.store.inspect(f.bind());assert.equal(r.facts!.material.spki,materials[0].spki);assert.deepEqual(r.blockers,[]);
  });
  await t.test('legacy is blocked; same-transaction create and explicit adoption use the canonical anchor',async()=>{
    const f=await setup();assert.deepEqual((await f.store.inspect(f.bind())).blockers,[...issuerGaps]);await assert.rejects(f.apply(f.intent('create')));
    await f.apply(f.intent('adopt'));assert.deepEqual((await f.store.inspect(f.bind())).blockers,[]);assert.deepEqual((await f.store.inspect(f.bind(),f.iso(-1))).blockers,[...issuerGaps]);
    const fresh=await setup(false);await fresh.apply(fresh.intent('create'));assert.deepEqual((await fresh.store.inspect(fresh.bind())).blockers,[]);
    assert.equal((await db.trustedProviderTicketKey.findUniqueOrThrow({where:{workspaceId:fresh.workspaceId}})).epoch,1);
  });
  await t.test('native owner and exact accepted decision predicates reject wrong or ambiguous authority',async()=>{
    for(const mode of ['actor','ambiguous','expired','binding']){const f=await setup(),i=f.intent('adopt',mode==='expired'?{expiresAt:'2000-01-01T00:00:00.000Z'}:mode==='binding'?{binding:{...f.intent('adopt').binding,installationId:randomUUID()}}:{}),c=await f.command(i);
      if(mode==='actor'||mode==='ambiguous')await prepare(async tx=>{const other=await tx.user.create({data:{email:randomUUID()+'@example.test',passwordHash:'synthetic-not-a-login'}});
        if(mode==='actor')await tx.$executeRaw`UPDATE decision_acceptances SET actor_user_id=${other.id}::uuid WHERE decision_id=${c.decisionId}::uuid`;
        else await tx.workspaceMembership.create({data:{workspaceId:f.workspaceId,userId:other.id,role:'owner'}});
      });const before=await snapshot();await assert.rejects(f.store.apply(c));await assert.rejects(f.direct(c));assert.deepEqual(await snapshot(),before);
    }
  });
  await t.test('stage overlap, exact ticket issue-time and hard cutover preserve monotonic reserved high-water',async()=>{
    const f=await setup();await f.apply(f.intent('adopt'));await assert.rejects(f.apply(f.intent('stage',{cutoverAt:f.iso(302000)})));
    await f.apply(f.intent('stage'));assert.equal((await db.trustedProviderTicketKey.findUniqueOrThrow({where:{workspaceId:f.workspaceId}})).epoch,2);
    assert.deepEqual((await f.store.inspect(f.bind(1,2))).blockers,[...issuerGaps]);f.at(1000);
    for(const b of [f.bind(),f.bind(1,2)])assert.deepEqual((await f.store.inspect(b,f.iso(1000))).blockers,[]);
    assert.deepEqual((await f.store.inspect(f.bind(1,2),f.iso())).blockers,[...issuerGaps]);await assert.rejects(f.apply(f.intent('cutover')));f.at(10000);
    for(const b of [f.bind(),f.bind(1,2)])assert.deepEqual((await f.store.inspect(b,f.iso(1000))).blockers,[...issuerGaps]);
    await f.apply(f.intent('cutover'));assert.deepEqual((await f.store.inspect(f.bind(1,2),f.iso(1000))).blockers,[]);assert.deepEqual((await f.store.inspect(f.bind(),f.iso())).blockers,[...issuerGaps]);
  });
  await t.test('terminal revoke and retire cannot revive; ABA, reused key and stale epochs cannot return',async()=>{
    const f=await setup();await f.apply(f.intent('adopt'));await f.apply(f.intent('stage'));await f.apply(f.intent('revoke'));
    await assert.rejects(f.apply(f.intent('cutover')));await assert.rejects(f.apply(f.intent('revoke')));
    for(const material of [materials[0],materials[1]])await assert.rejects(f.apply(f.intent('stage',{material})));
    await f.apply(f.intent('stage',{material:materials[2]}));f.at(10000);await f.apply(f.intent('retire',{targetEpoch:1}));await f.apply(f.intent('cutover'));
    assert.deepEqual((await f.store.inspect(f.bind(2,3),f.iso(1000))).blockers,[]);await f.apply(f.intent('revoke'));assert.deepEqual((await f.store.inspect(f.bind(2,3))).blockers,[...issuerGaps]);
    await assert.rejects(f.apply(f.intent('stage',{targetEpoch:2,material:materials[0]})));
  });
  await t.test('managed direct insert/update/delete and immutable binding/history mutations cannot bypass journals',async()=>{
    const f=await setup();await f.apply(f.intent('adopt'));const before=await snapshot();
    for(const data of [{workspaceId:randomUUID()},{installationId:randomUUID()},{keyId:materials[1].keyId,publicKeyDigest:materials[1].publicKeyDigest,epoch:2}])await assert.rejects(db.trustedProviderTicketKey.update({where:{workspaceId:f.workspaceId},data}));
    await assert.rejects(f.insertAnchor());await assert.rejects(db.trustedProviderTicketKey.delete({where:{workspaceId:f.workspaceId}}));
    await assert.rejects(db.$executeRaw`UPDATE bootstrap_issuer_history SET record='{}'::jsonb WHERE workspace_id=${f.workspaceId}::uuid`);
    await assert.rejects(db.$executeRaw`DELETE FROM bootstrap_issuer_history WHERE workspace_id=${f.workspaceId}::uuid`);
    await assert.rejects(db.$executeRawUnsafe('TRUNCATE bootstrap_issuer_audit'));assert.deepEqual(await snapshot(),before);
  });
  await t.test('existing owner-ticket-store rotate remains fenced for legacy and rejects managed direct rotation',async()=>{
    const f=await setup(),owner=createPrismaOwnerTicketStore(db),auth={workspaceId:f.workspaceId,userId:f.ownerId,authType:'user' as const,workspaceRole:'owner' as const};
    const taskId=randomUUID(),applicationId=randomUUID(),executionId=randomUUID(),ticketId=randomUUID(),decisionId=await f.accept({scope:[{type:'task',id:taskId}]});
    await prepare(async tx=>{
      await tx.application.create({data:{id:applicationId,workspaceId:f.workspaceId,name:'Inert rotation fixture',slug:randomUUID()}});
      await tx.task.create({data:{id:taskId,workspaceId:f.workspaceId,title:'Inert rotation fixture'}});
      await tx.agentExecution.create({data:{id:executionId,workspaceId:f.workspaceId,taskId,applicationId,requestedByType:'user',status:'claimed',attempt:1}});
    });
    // Unsigned synthetic persistence row only; no issuer/signature/credential.
    await db.trustedProviderTicket.create({data:{id:ticketId,workspaceId:f.workspaceId,installationId:f.installationId,taskId,executionId,attempt:1,decisionId,decisionRevision:1,ownerId:f.ownerId,
      keyId:materials[0].keyId,keyEpoch:1,digest:hash('1'),nonceDigest:hash('2'),acceptanceDigest:hash('3'),contextDigest:hash('4'),claimDigest:hash('5'),challenge:hash('6'),
      issuedAt:f.now(),notBefore:f.now(),expiresAt:new Date(f.now().getTime()+60000),state:'issued',version:1}});
    const before=(await db.$queryRaw<any[]>`SELECT revision::text AS value FROM ready_source_fence WHERE id=1`)[0].value;
    await owner.transaction(async tx=>{assert.equal(await tx.primaryOwner(auth),true);assert.equal(await tx.rotate(f.workspaceId,1,materials[1].keyId,materials[1].publicKeyDigest,new Date()),true);});
    assert.equal((await db.trustedProviderTicketKey.findUniqueOrThrow({where:{workspaceId:f.workspaceId}})).epoch,2);
    const revoked=await db.trustedProviderTicket.findUniqueOrThrow({where:{id:ticketId}});assert.equal(revoked.state,'revoked');assert.equal(revoked.version,2);assert.ok(revoked.revokedAt);
    assert.deepEqual(await db.$queryRaw<any[]>`SELECT version,state FROM trusted_provider_ticket_journal WHERE ticket_id=${ticketId}::uuid ORDER BY version`,[{version:1,state:'issued'},{version:2,state:'revoked'}]);
    assert.equal(await db.event.count({where:{workspaceId:f.workspaceId,type:'owner_ticket_key_rotated'}}),1);
    assert.ok(BigInt((await db.$queryRaw<any[]>`SELECT revision::text AS value FROM ready_source_fence WHERE id=1`)[0].value)>BigInt(before));
    assert.deepEqual((await f.store.inspect(f.bind(1,2))).blockers,[...issuerGaps]);
    await f.apply(f.intent('adopt',{targetEpoch:2,material:materials[1]}));const snapshotBefore=await snapshot();
    await assert.rejects(owner.transaction(async tx=>{await tx.primaryOwner(auth);return tx.rotate(f.workspaceId,2,materials[2].keyId,materials[2].publicKeyDigest,new Date());}));
    assert.deepEqual(await snapshot(),snapshotBefore);assert.deepEqual((await f.store.inspect(f.bind(1,2))).blockers,[]);
  });
  await t.test('twenty native writers admit one CAS winner and decision/operation replay never appends',async()=>{
    const f=await setup();await f.apply(f.intent('adopt'));const commands=[];for(let n=0;n<20;n++)commands.push(await f.command(f.intent('stage')));
    const results=await Promise.allSettled(commands.map(c=>f.store.apply(c)));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    const before=await snapshot();await assert.rejects(f.store.apply(commands[results.findIndex(r=>r.status==='fulfilled')]));assert.deepEqual(await snapshot(),before);
    assert.equal((await db.$queryRaw<any[]>`SELECT count(*)::int AS n FROM bootstrap_issuer_history WHERE workspace_id=${f.workspaceId}::uuid`)[0].n,2);
  });
  await t.test('all write phases and deferred/late COMMIT rejection roll back state history audit and fence',async()=>{
    await db.$executeRawUnsafe("CREATE FUNCTION native_issuer_fail() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic rollback'; END $$");
    await db.$executeRawUnsafe("CREATE FUNCTION native_issuer_late_fail() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(0.1); RAISE EXCEPTION 'synthetic late rollback'; END $$");
    for(const fault of ['fence','append','precommit','history','audit','commit','late']){const f=await setup();await f.apply(f.intent('adopt'));const c=await f.command(f.intent('stage')),before=await snapshot(),attempts={...f.attempts};
      if(['fence','append','precommit'].includes(fault))f.fault(fault);
      else f.before(async tx=>{if(fault==='commit'||fault==='late')await tx.$executeRawUnsafe(`CREATE CONSTRAINT TRIGGER native_issuer_commit_failure AFTER INSERT ON bootstrap_issuer_history DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ${fault==='late'?'native_issuer_late_fail':'native_issuer_fail'}()`);
        else await tx.$executeRawUnsafe(fault==='history'?'CREATE TRIGGER native_issuer_history_failure AFTER INSERT ON bootstrap_issuer_history FOR EACH ROW EXECUTE FUNCTION native_issuer_fail()':'CREATE TRIGGER native_issuer_audit_failure AFTER INSERT ON bootstrap_issuer_audit FOR EACH ROW EXECUTE FUNCTION native_issuer_fail()');});
      if(fault==='commit'||fault==='late')await assert.rejects(f.store.apply(c),IssuerReconciliationRequired);else await assert.rejects(f.store.apply(c));
      assert.deepEqual(await snapshot(),before,fault);assert.equal(f.attempts.writes-attempts.writes,1);assert.equal(f.attempts.appends-attempts.appends,fault==='fence'?0:1);
    }
    const f=await setup(false),c=await f.command(f.intent('create')),before=await snapshot();f.fault('create');await assert.rejects(f.store.apply(c));assert.deepEqual(await snapshot(),before);
  });
  await t.test('real connection loss before COMMIT is reconciliable and never replays the callback',async()=>{
    const f=await setup();await f.apply(f.intent('adopt'));const c=await f.command(f.intent('stage')),before=await snapshot(),attempts={...f.attempts};f.fault('connection');
    await assert.rejects(f.store.apply(c),IssuerReconciliationRequired);assert.deepEqual(await snapshot(),before);
    assert.equal(f.attempts.writes-attempts.writes,1);assert.equal(f.attempts.appends-attempts.appends,1);
  });
  await t.test('lost real COMMIT completion leaves one committed operation but reports reconciliation required',async()=>{
    const f=await setup();await f.apply(f.intent('adopt'));const c=await f.command(f.intent('stage')),attempts={...f.attempts};
    f.before(tx=>tx.$queryRawUnsafe("SELECT 'native_drop_commit_response'").then(()=>{}));
    await assert.rejects(f.store.apply(c),(e:any)=>e instanceof IssuerReconciliationRequired&&e.retryable===false);
    assert.equal(f.attempts.writes-attempts.writes,1);assert.equal(f.attempts.appends-attempts.appends,1);
    assert.deepEqual(await db.$queryRaw<any[]>`SELECT h.revision,(a.record_digest=h.record_digest AND f.revision>=a.fence_revision) AS verified FROM bootstrap_issuer_history h JOIN bootstrap_issuer_audit a ON a.operation_id=h.id JOIN ready_source_fence f ON f.id=1 WHERE h.id=${c.operationId}::uuid`,[{revision:2,verified:true}]);
  });
  await t.test('every missing disabled rebound changed/configured guard and replica mode fail closed',async()=>{
    const f=await setup();await f.apply(f.intent('adopt'));const before=await snapshot();
    for(const g of issuerGuards)for(const ddl of [`ALTER TABLE ${g.table} DISABLE TRIGGER ${g.name}`,`DROP TRIGGER ${g.name} ON ${g.table}`,
      `ALTER FUNCTION ${g.function}() RENAME TO native_rebound_guard`,`CREATE OR REPLACE FUNCTION ${g.function}() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$`,`ALTER FUNCTION ${g.function}() SET search_path=pg_catalog`]){
      await probe(async tx=>{await tx.$executeRawUnsafe(ddl);assert.deepEqual((await inspectCanonicalIssuer(tx,f.bind(),f.now(),f.iso())).blockers,[...issuerGaps]);});
    }
    await probe(async tx=>{await tx.$executeRaw`SET LOCAL session_replication_role=replica`;assert.deepEqual((await inspectCanonicalIssuer(tx,f.bind(),f.now(),f.iso())).blockers,[...issuerGaps]);});
    for(const g of issuerGuards){const c=await f.command(f.intent('stage'));f.before(tx=>tx.$executeRawUnsafe(`ALTER TABLE ${g.table} DISABLE TRIGGER ${g.name}`).then(()=>{}));await assert.rejects(f.store.apply(c));}
    assert.deepEqual(await snapshot(),before);
  });
  await t.test('shared writer fence blocks direct key creation until the holder releases',async()=>{
    const f=await setup(false);let release!:()=>void,ready!:()=>void;const gate=new Promise<void>(r=>release=r),locked=new Promise<void>(r=>ready=r);
    const holder=db.$transaction(async tx=>{await tx.$executeRaw`UPDATE ready_source_fence SET revision=revision+1 WHERE id=1`;ready();await gate;},{timeout:30000});await locked;
    let done=false;const writer=f.insertAnchor().then(()=>{done=true;});try{let waiting=0;for(let n=0;n<30&&!waiting;n++){await new Promise(r=>setTimeout(r,25));waiting=(await db.$queryRaw<any[]>`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'`)[0].n;}
      assert.ok(waiting>0);assert.equal(done,false);}finally{release();await holder;await writer;}assert.equal(done,true);assert.deepEqual((await f.store.inspect(f.bind())).blockers,[...issuerGaps]);
  });
  await t.test('read-only inspection does not repair missing audit or legacy state and never changes the fence',async()=>{
    const f=await setup();const adopted=await f.apply(f.intent('adopt')),before=await snapshot();f.modes.length=0;
    for(let n=0;n<3;n++)assert.deepEqual((await f.store.inspect(f.bind())).blockers,[]);assert.deepEqual(f.modes,['on','on','on']);assert.deepEqual(await snapshot(),before);
    await probe(async tx=>{await tx.$executeRaw`SET LOCAL session_replication_role=replica`;await tx.$executeRaw`DELETE FROM bootstrap_issuer_audit WHERE operation_id=${adopted.id}::uuid`;await tx.$executeRaw`SET LOCAL session_replication_role=origin`;
      assert.deepEqual((await inspectCanonicalIssuer(tx,f.bind(),f.now(),f.iso())).blockers,[...issuerGaps]);});
    await assert.rejects(db.$transaction(async tx=>{await tx.$executeRaw`SET TRANSACTION READ ONLY`;await tx.$executeRaw`UPDATE ready_source_fence SET revision=revision+1 WHERE id=1`;},{isolationLevel:'RepeatableRead'}));
    assert.deepEqual(await snapshot(),before);
  });
  await t.test('bootstrap clears exactly the two issuer facts beside qualified lifecycle and keeps three blockers',async()=>{
    const f=await setup();await f.apply(f.intent('adopt'));const generation=randomUUID(),store=createPrismaWorkerIdentityLifecycleStore(db,()=>f.now());
    for(const kind of ['installation','host'] as const){const i={schemaVersion:'worker-identity-lifecycle-v1' as const,workspaceId:f.workspaceId,kind,subjectId:kind==='host'?f.hostId:f.installationId,
      action:'adopt' as const,expected:null,generation:kind==='host'?randomUUID():generation,installationId:f.installationId,installationGeneration:generation,hostFingerprint:kind==='host'?hash('a'):null,
      authorityDigest:hash('b'),adoptionEvidenceDigest:hash('c'),expiresAt:new Date(Date.now()+600000).toISOString()};
      await store.apply({operationId:randomUUID(),decisionId:await f.accept({workerIdentityLifecycle:i}),decisionRevision:1,intent:i});
    }
    const source=createCanonicalBootstrapAuthoritySource(()=>f.now());await db.$transaction(async tx=>{await tx.$executeRaw`SET TRANSACTION READ ONLY`;const release=await source.bindTransaction!(tx,'read');
      try{await assert.rejects(source.context(tx,f.bind(),f.iso()),(e:any)=>e instanceof CanonicalBootstrapBlocked&&JSON.stringify(e.blockers)===JSON.stringify(['bootstrap_channel_authority_unavailable','bootstrap_ticket_revocation_unavailable','signed_current_decision_unavailable']));}finally{release();}
    },{isolationLevel:'RepeatableRead'});
  });
  await t.test('persisted issuer records contain only public material and automatic matching audit',async()=>{
    const rows=await db.$queryRaw<any[]>`SELECT h.record,(a.record_digest=h.record_digest AND h.record_digest=encode(sha256(convert_to(h.record::text,'UTF8')),'hex')) AS verified FROM bootstrap_issuer_history h JOIN bootstrap_issuer_audit a ON a.operation_id=h.id`;
    assert.ok(rows.length>0);for(const row of rows){assert.equal(row.verified,true);if(row.record.intent.material)issuerMaterial.parse(row.record.intent.material);}
    const serialized=JSON.stringify(rows);for(const forbidden of ['privateKey','PRIVATE KEY','credentialSecret','forbidden-field','"seed"'])assert.ok(!serialized.includes(forbidden));
    assert.equal(effects,0);assert.deepEqual(logs,[]);
  });
});
