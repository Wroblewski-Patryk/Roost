import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import net from "node:net";
import tls from "node:tls";
import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import childProcess from "node:child_process";
import { Prisma, PrismaClient } from "@prisma/client";
import { fixture } from "./worker-transport-fixture";
import { createPrismaWorkerTransportStore } from "../modules/api-keys/worker-transport-store";
import { createWorkerTransportService, type SignedTransport, type TransportRecord } from "../modules/api-keys/worker-transport.service";
import { workerTicketFingerprint } from "../auth/worker-ticket-principal";
import { reviewDigest } from "../modules/agent-runtime/task-review-contract";

const enabled=process.env.WORKER_TRANSPORT_NATIVE_DATABASE;
const pin=(x:string)=>x.repeat(64),copy=<T>(x:T):T=>structuredClone(x);
const ok=(r:any)=>{assert.equal(r.ok,true,r.error);for(const name of ["transportQualified","implementationReady","executionSupported","pilotReady","liveAdmissionAllowed","pilotExecutionAuthorized","pilotExecutionStarted"])assert.equal(r[name],false);return r;};
const denied=(r:any)=>assert.equal(r.ok,false);

test("Worker transport native PostgreSQL persistence qualification",{skip:!enabled,timeout:240000},async t=>{
  assert.match(enabled!,/^companycore_test_transport_[a-f0-9]{32}$/);
  const url=new URL(process.env.DATABASE_URL!);assert.equal(url.pathname,"/"+enabled);assert.equal(url.hostname,"127.0.0.1");
  const db=new PrismaClient();await db.$connect();t.after(()=>db.$disconnect());
  const owner=await db.$queryRaw<any[]>`SELECT current_database() AS name,pg_get_userbyid(datdba) AS owner,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()`;
  assert.equal(owner[0].name,enabled);assert.equal(owner[0].marker,"worker-transport-native:"+enabled!.split("_").at(-1));assert.equal(owner[0].owner,"companycore");
  let effects=0;const forbid=()=>{effects++;throw Error("non-database effect forbidden");};
  for(const method of ["connect","createConnection"] as const)t.mock.method(net,method,forbid);
  t.mock.method(net.Server.prototype,"listen",forbid);t.mock.method(tls,"connect",forbid);
  for(const module of [http,https])for(const method of ["request","get"] as const)t.mock.method(module,method,forbid);
  for(const method of ["lookup","resolve","resolve4","resolve6"] as const){t.mock.method(dns,method,forbid);t.mock.method(dns.promises,method,forbid);}
  t.mock.method(globalThis,"fetch",forbid);
  for(const method of ["spawn","spawnSync","exec","execSync","execFile","execFileSync","fork"] as const)t.mock.method(childProcess,method,forbid);

  // Fixture-only canonical source injection, scoped by the owned database guard
  // above. Replica mode is LOCAL to preparation transactions, never the adapter
  // or tamper tests. This qualifies transport persistence, not governance/handoff
  // acceptance workflows (separately qualified). No application seed is run.
  async function sourceFixture<T>(work:(tx:Prisma.TransactionClient)=>Promise<T>){
    return db.$transaction(async tx=>{await tx.$executeRaw`SET LOCAL session_replication_role=replica`;return work(tx);});
  }
  async function setup(){
    let last:SignedTransport<TransportRecord>|null=null,fault="",readModes:string[]=[];
    const f=fixture(()=>last);f.advance(Date.now()-Date.parse(f.iso()));
    const i=f.identity;let hash=reviewDigest(randomUUID());i.credentialFingerprint=workerTicketFingerprint(hash);
    async function credential(tx:Prisma.TransactionClient){
      await tx.apiKey.create({data:{id:i.credentialId,workspaceId:i.workspaceId,name:"Synthetic transport source",keyHash:hash,keyPrefix:"synthetic",scopes:["agent-runtime:claim"],
        active:true,workerHostId:i.hostId,workerInstallationId:i.installationId,workerBindingEpoch:i.credentialEpoch,credentialVersion:i.credentialVersion,expiresAt:new Date(f.iso(86400000))}});
      const handoff=randomUUID(),digest=reviewDigest(handoff),at=new Date(f.iso());
      await tx.$executeRaw`INSERT INTO worker_credential_handoffs(id,workspace_id,installation_id,host_id,host_fingerprint,device_secret_hash,challenge_hash,request_digest,user_code_hash,
        origin,certificate_fingerprint,state,credential_id,response_digest,spent_at,ack_deadline,acknowledged_at,created_at,expires_at)
        VALUES(${handoff}::uuid,${i.workspaceId}::uuid,${i.installationId}::uuid,${i.hostId}::uuid,${i.hostFingerprint},${digest},${digest},${digest},${digest},
          'https://synthetic.example.test',${pin("c")},'acknowledged',${i.credentialId}::uuid,${digest},${at},${new Date(f.iso(60000))},${at},${at},${new Date(f.iso(120000))})`;
    }
    await sourceFixture(async tx=>{
      await tx.user.create({data:{id:f.context.ownerId,email:randomUUID()+"@example.test",passwordHash:"synthetic-not-a-login"}});
      await tx.workspace.create({data:{id:i.workspaceId,name:"Synthetic transport native fixture",ownerUserId:f.context.ownerId}});
      await tx.workspaceMembership.create({data:{workspaceId:i.workspaceId,userId:f.context.ownerId,role:"owner"}});
      await tx.agentHost.create({data:{id:i.hostId,workspaceId:i.workspaceId,name:"Inert native host",slug:randomUUID(),platform:"synthetic",status:"online"}});
      await tx.trustedProviderTicketKey.create({data:{workspaceId:i.workspaceId,installationId:i.installationId,keyId:i.ticketKeyId,epoch:i.ticketKeyEpoch,publicKeyDigest:i.ticketPublicKeyDigest}});
      await credential(tx);
    });
    const wrapped=new Proxy(db,{get(target,key){if(key!=="$transaction")return Reflect.get(target,key);
      return (work:any,options:any)=>target.$transaction(async tx=>{
        assert.equal((await tx.$queryRaw<any[]>`SHOW session_replication_role`)[0].session_replication_role,"origin");
        if(options.isolationLevel==="RepeatableRead"){
          await tx.$executeRaw`SET TRANSACTION READ ONLY`;
          readModes.push((await tx.$queryRaw<any[]>`SHOW transaction_read_only`)[0].transaction_read_only);
        }else assert.equal(options.isolationLevel,"Serializable");
        const proxied=new Proxy(tx,{get(target,key){const value=Reflect.get(target,key);
          if(typeof key!=="string"||!["workerTransportGeneration","workerTransportHistory","workerTransportHead","workerTransportAudit","event"].includes(key))return typeof value==="function"?value.bind(target):value;
          return new Proxy(value,{get(model,method){const fn=Reflect.get(model,method);if(typeof fn!=="function")return fn;
            return async(...args:any[])=>{const result=await fn.apply(model,args);if(fault===key+"."+String(method))throw Error("injected native rollback");return result;};}});
        }});
        const result=await work(proxied);if(fault==="precommit")throw Error("injected native precommit");return result;
      },{...options,maxWait:15000,timeout:30000});
    }});
    const store=createPrismaWorkerTransportStore(wrapped,f.signer,()=>new Date(f.iso())),service=createWorkerTransportService(store,f.signer,()=>new Date(f.iso()));
    async function command(intent=f.intent()){
      const c=f.command(intent),preview=randomUUID();
      await sourceFixture(async tx=>{
        await tx.decision.create({data:{id:c.decisionId,workspaceId:i.workspaceId,title:"Synthetic exact transport acceptance",status:"accepted",source:"synthetic_native_fixture"}});
        await tx.$executeRaw`INSERT INTO decision_revisions(decision_id,workspace_id,version,body,actor_user_id,request_id,request_hash)
          VALUES(${c.decisionId}::uuid,${i.workspaceId}::uuid,1,${JSON.stringify({workerTransport:intent})}::jsonb,${f.context.ownerId}::uuid,${randomUUID()}::uuid,${reviewDigest(intent)})`;
        await tx.$executeRaw`INSERT INTO decision_impact_previews(id,decision_id,workspace_id,version,impact,actor_user_id,request_id,request_hash)
          VALUES(${preview}::uuid,${c.decisionId}::uuid,${i.workspaceId}::uuid,1,'{}'::jsonb,${f.context.ownerId}::uuid,${randomUUID()}::uuid,${reviewDigest(intent)})`;
        await tx.$executeRaw`INSERT INTO decision_acceptances(id,decision_id,workspace_id,preview_id,actor_user_id,request_id,request_hash,authority,created_at)
          VALUES(${randomUUID()}::uuid,${c.decisionId}::uuid,${i.workspaceId}::uuid,${preview}::uuid,${f.context.ownerId}::uuid,${randomUUID()}::uuid,${reviewDigest(intent)},'{"status":"owner_reserved"}'::jsonb,${new Date(f.iso())})`;
      });return c;
    }
    async function send(c:Awaited<ReturnType<typeof command>>){const r=await service.command(f.auth(),c);if(r.ok)last=r.record;return r;}
    async function snapshot(){
      const rows:unknown[]=[];
      // Fixed allowlist only; includes all possible adapter effects plus source
      // credential expiry/lastUsedAt and the shared fence.
      for(const table of ["worker_transport_generations","worker_transport_history","worker_transport_heads","worker_transport_audit","events","ready_source_fence","api_keys"])
        rows.push(await db.$queryRawUnsafe(`SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb) AS value FROM "${table}" t`));
      return rows;
    }
    async function replaceIdentity(){
      const previousCredentialId=i.credentialId;
      i.installationId=randomUUID();i.credentialId=randomUUID();i.credentialEpoch++;i.credentialVersion++;
      hash=reviewDigest(randomUUID());i.credentialFingerprint=workerTicketFingerprint(hash);
      await sourceFixture(async tx=>{
        await tx.apiKey.update({where:{id:previousCredentialId},data:{active:false,revokedAt:new Date(f.iso())}});
        await tx.trustedProviderTicketKey.update({where:{workspaceId:i.workspaceId},data:{installationId:i.installationId}});await credential(tx);
      });
    }
    return {...f,service,store,command,send,snapshot,replaceIdentity,readModes,fault:(s:string)=>fault=s,head:()=>last,
      create:async()=>send(await command())};
  }
  const headRows=(f:Awaited<ReturnType<typeof setup>>)=>db.workerTransportHead.findMany({where:{workspaceId:f.identity.workspaceId}});

  await t.test("real create/stage/cutover/revoke/readmit and replacement identity preserve history",async()=>{
    const f=await setup(),created=ok(await f.create()),first=await db.workerTransportHistory.findFirstOrThrow({where:{workspaceId:f.identity.workspaceId}});
    ok(await f.send(await f.command(f.intent("stage"))));f.advance(10001);ok(await f.send(await f.command(f.intent("cutover"))));
    const flight=ok(await f.service.inspect(f.head()!,{identity:f.identity,revision:3,recordDigest:reviewDigest(f.head()),certificateEpoch:2,highWaterEpoch:2},f.observation(f.head()!.payload)));
    ok(await f.send(await f.command(f.intent("revoke"))));assert.equal((await f.service.complete(flight.receipt)).error,"delivery_unknown");
    await f.replaceIdentity();const i=f.intent();i.identity=copy(f.identity);i.certificateEpoch=3;i.profile.certificate.fingerprint=pin("2");i.profile.bootstrap.fingerprint=pin("2");
    const r=ok(await f.send(await f.command(i)));ok(await f.service.inspect(r.record,r.anchor,f.observation(r.record.payload)));
    denied(await f.service.inspect(created.record,created.anchor,f.observation(created.record.payload)));
    assert.deepEqual(await db.workerTransportHistory.findUnique({where:{id:first.id}}),first);
    assert.equal((await headRows(f)).length,1);assert.equal(await db.workerTransportGeneration.count({where:{workspaceId:f.identity.workspaceId}}),2);
    assert.equal(await db.workerTransportHistory.count({where:{workspaceId:f.identity.workspaceId}}),5);
    assert.equal(await db.workerTransportAudit.count({where:{history:{workspaceId:f.identity.workspaceId}}}),5);
  });
  await t.test("20 native transactions each for create/stage/cutover/revoke/readmit commit one winner",async()=>{
    const f=await setup();
    for(const action of ["create","stage","cutover","revoke","readmit"] as const){
      if(action==="cutover")f.advance(10001);
      const i=f.intent(action==="readmit"?"create":action);
      if(action==="readmit"){i.certificateEpoch=3;i.profile.certificate.fingerprint=pin("3");i.profile.bootstrap.fingerprint=pin("3");}
      const commands=[];for(let n=0;n<20;n++)commands.push(await f.command(i));
      const before=await db.workerTransportHistory.count({where:{workspaceId:f.identity.workspaceId}}),results=await Promise.all(commands.map(c=>f.send(c)));
      assert.equal(results.filter(r=>r.ok).length,1,JSON.stringify(results.map(r=>r.error)));assert.ok(results.filter(r=>!r.ok).every(r=>r.error==="revision_changed"));
      assert.equal(await db.workerTransportHistory.count({where:{workspaceId:f.identity.workspaceId}}),before+1);assert.equal((await headRows(f)).length,1);
    }
  });
  await t.test("real failures after every persistence boundary and precommit roll back all effects",async()=>{
    for(const point of ["workerTransportGeneration.create","workerTransportHistory.create","workerTransportHead.create","event.create","workerTransportAudit.create","precommit"]){
      const f=await setup(),c=await f.command(),before=await f.snapshot();f.fault(point);denied(await f.send(c));assert.deepEqual(await f.snapshot(),before,point);
    }
    for(const point of ["workerTransportHistory.create","workerTransportHead.updateMany","event.create","workerTransportAudit.create","precommit"]){
      const f=await setup();ok(await f.create());const c=await f.command(f.intent("stage")),before=await f.snapshot();f.fault(point);denied(await f.send(c));assert.deepEqual(await f.snapshot(),before,point);
    }
  });
  await t.test("native RepeatableRead inspect/complete are SQL read-only with identical persistent snapshots",async()=>{
    const f=await setup(),r=ok(await f.create()),before=await f.snapshot();
    const flight=ok(await f.service.inspect(r.record,r.anchor,f.observation(r.record.payload)));ok(await f.service.complete(flight.receipt));
    f.advance(7200001);denied(await f.service.inspect(r.record,r.anchor,f.observation(r.record.payload)));
    assert.deepEqual(await f.snapshot(),before);assert.deepEqual(f.readModes,["on","on","on"]);
    ok(await f.send(await f.command(f.intent("revoke"))));
  });
  await t.test("service replay/revision/digest/epoch/pin/revoked-resurrection and unknown-secret denials leave no effects",async()=>{
    const f=await setup(),c=await f.command();ok(await f.send(c));denied(await f.send(c));
    for(const patch of [{expectedRevision:0},{expectedDigest:pin("0")},{certificateEpoch:3},{privateKey:"synthetic-forbidden"}]){
      const i={...f.intent("stage"),...patch},cmd=await f.command(i),before=await f.snapshot();denied(await f.send(cmd));assert.deepEqual(await f.snapshot(),before);
    }
    ok(await f.send(await f.command(f.intent("revoke"))));
    for(const action of ["stage","cutover","revoke"] as const){const cmd=await f.command(f.intent(action)),before=await f.snapshot();denied(await f.send(cmd));assert.deepEqual(await f.snapshot(),before);}
    for(const epoch of [1,2,3]){const i=f.intent();i.certificateEpoch=epoch;const cmd=await f.command(i),before=await f.snapshot();denied(await f.send(cmd));assert.deepEqual(await f.snapshot(),before);}
  });
  await t.test("canonical source drift is reread from PostgreSQL and denies inspection",async()=>{
    for(const kind of ["owner","membership","host","credential","key","decision"]){const f=await setup(),r=ok(await f.create());
      await sourceFixture(async tx=>{
        if(kind==="owner"){const u=await tx.user.create({data:{email:randomUUID()+"@example.test",passwordHash:"synthetic"}});await tx.workspace.update({where:{id:f.identity.workspaceId},data:{ownerUserId:u.id}});}
        if(kind==="membership")await tx.workspaceMembership.update({where:{workspaceId_userId:{workspaceId:f.identity.workspaceId,userId:f.context.ownerId}},data:{role:"admin"}});
        if(kind==="host")await tx.agentHost.update({where:{id:f.identity.hostId},data:{status:"disabled"}});
        if(kind==="credential")await tx.apiKey.update({where:{id:f.identity.credentialId},data:{credentialVersion:2}});
        if(kind==="key")await tx.trustedProviderTicketKey.update({where:{workspaceId:f.identity.workspaceId},data:{epoch:2}});
        if(kind==="decision")await tx.decision.update({where:{id:r.record.payload.decisionId},data:{status:"revoked"}});
      });const before=await f.snapshot();denied(await f.service.inspect(r.record,r.anchor,f.observation(r.record.payload)));assert.deepEqual(await f.snapshot(),before);
    }
  });
  await t.test("native CHECK/FK/unique tamper guards and documented privileged-SQL limitations",async()=>{
    const f=await setup();ok(await f.create());const h=(await headRows(f))[0];
    const expectConstraint=async(sql:Prisma.Sql)=>{await assert.rejects(db.$executeRaw(sql),(e:any)=>e.code==="P2010"&&["23503","23505","23514"].includes(e.meta?.code));};
    await expectConstraint(Prisma.sql`INSERT INTO worker_transport_heads SELECT * FROM worker_transport_heads WHERE workspace_id=${f.identity.workspaceId}::uuid`);
    await expectConstraint(Prisma.sql`UPDATE worker_transport_heads SET record_digest=${pin("0")} WHERE workspace_id=${f.identity.workspaceId}::uuid`);
    await expectConstraint(Prisma.sql`UPDATE worker_transport_heads SET history_id=${randomUUID()}::uuid WHERE workspace_id=${f.identity.workspaceId}::uuid`);
    await expectConstraint(Prisma.sql`UPDATE worker_transport_history SET high_water_epoch=0 WHERE id=${h.historyId}::uuid`);
    await expectConstraint(Prisma.sql`UPDATE worker_transport_audit SET event_id=${randomUUID()}::uuid WHERE history_id=${h.historyId}::uuid`);
    await expectConstraint(Prisma.sql`UPDATE worker_transport_history SET record=record||'{"privateKey":"synthetic-forbidden"}'::jsonb WHERE id=${h.historyId}::uuid`);
    await expectConstraint(Prisma.sql`UPDATE worker_transport_generations SET identity=identity||'{"secret":"synthetic-forbidden"}'::jsonb WHERE workspace_id=${f.identity.workspaceId}::uuid`);
    ok(await f.send(await f.command(f.intent("revoke"))));const revoked=(await headRows(f))[0];
    await expectConstraint(Prisma.sql`UPDATE worker_transport_history SET previous_revision=55 WHERE id=${revoked.historyId}::uuid`);
    await expectConstraint(Prisma.sql`UPDATE worker_transport_history SET previous_digest=${pin("0")} WHERE id=${revoked.historyId}::uuid`);
    const history=await db.workerTransportHistory.findUniqueOrThrow({where:{id:revoked.historyId}}),cmd=await f.command();
    for(const epoch of [2,4]){
      const record={...(history.record as any),revision:3,state:"current",certificateEpoch:epoch,highWaterEpoch:epoch,decisionId:cmd.decisionId,requestId:cmd.requestId};
      // All row mirrors/IDs are coherent; terminal generation reuse (epoch 2)
      // and skipped watermark (epoch 4) fail native CHECK constraints.
      const patch={id:randomUUID(),revision:3,state:"current",certificate_epoch:epoch,high_water_epoch:epoch,decision_id:cmd.decisionId,request_id:cmd.requestId,
        previous_revision:2,previous_digest:history.recordDigest,previous_high_water:history.highWaterEpoch,previous_state:"revoked",previous_generation_id:history.generationId,record};
      await expectConstraint(Prisma.sql`INSERT INTO worker_transport_history SELECT (jsonb_populate_record(NULL::worker_transport_history,to_jsonb(h)||${JSON.stringify(patch)}::jsonb)).* FROM worker_transport_history h WHERE id=${history.id}::uuid`);
    }
    // These tables intentionally have no privileged-SQL immutability trigger.
    // Prove that limitation inside a transaction that is ALWAYS rolled back.
    const before=await f.snapshot();let tampered=false;
    await assert.rejects(db.$transaction(async tx=>{await tx.$executeRaw`UPDATE worker_transport_history SET signature=${pin("0")+pin("0")} WHERE id=${revoked.historyId}::uuid`;tampered=true;throw Error("rollback privilege probe");}),/rollback privilege probe/);
    assert.equal(tampered,true);assert.deepEqual(await f.snapshot(),before);
  });
  await t.test("public metadata only and zero non-database transport/provider/process effects",async()=>{
    const rows=await db.$queryRaw<any[]>`SELECT jsonb_agg(to_jsonb(h)) AS value FROM worker_transport_history h`;
    const text=JSON.stringify(rows);for(const denied of ["PRIVATE KEY","synthetic-forbidden","keyHash","approvalCommand","signedDecision"])assert.equal(text.includes(denied),false);
    assert.equal(effects,0);
    assert.equal((await db.$queryRaw<any[]>`SHOW session_replication_role`)[0].session_replication_role,"origin");
  });
});
