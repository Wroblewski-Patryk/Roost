import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import net from "node:net";
import tls from "node:tls";
import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import childProcess from "node:child_process";
import { Prisma,PrismaClient } from "@prisma/client";
import { bootstrapFixture } from "./worker-bootstrap-fixture";
import { createPrismaWorkerBootstrapStore,type BootstrapAuthoritySource } from "../modules/api-keys/worker-bootstrap-store";
import { createWorkerBootstrapService } from "../modules/api-keys/worker-bootstrap.service";
import { reviewDigest } from "../modules/agent-runtime/task-review-contract";

const enabled=process.env.WORKER_BOOTSTRAP_NATIVE_DATABASE,copy=<T>(v:T):T=>structuredClone(v),pin=(s:string)=>s.repeat(64);
const ok=(r:any)=>{assert.equal(r.ok,true,r.error);for(const flag of ["transportQualified","implementationReady","executionSupported","pilotReady","liveAdmissionAllowed","pilotExecutionAuthorized","pilotExecutionStarted","launchAuthority"])assert.equal(r[flag],false);return r;};
const no=(r:any)=>{assert.equal(r.ok,false);return r;};

test("Worker bootstrap native PostgreSQL qualification in one owned disposable database",{skip:!enabled,timeout:240000},async t=>{
  assert.match(enabled!,/^companycore_test_bootstrap_[a-f0-9]{32}$/);
  const url=new URL(process.env.DATABASE_URL!);assert.equal(url.hostname,"127.0.0.1");assert.equal(url.pathname,"/"+enabled);
  const db=new PrismaClient();await db.$connect();t.after(()=>db.$disconnect());
  const identity=await db.$queryRaw<any[]>`SELECT current_database() AS name,pg_get_userbyid(datdba) AS owner,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()`;
  assert.deepEqual(identity,[{name:enabled,owner:"companycore",marker:"worker-bootstrap-native:"+enabled!.split("_").at(-1)}]);
  let effects=0;const forbid=()=>{effects++;throw Error("non-database effect forbidden");};
  for(const m of ["connect","createConnection"] as const)t.mock.method(net,m,forbid);t.mock.method(net.Server.prototype,"listen",forbid);t.mock.method(tls,"connect",forbid);
  for(const module of [http,https])for(const m of ["request","get"] as const)t.mock.method(module,m,forbid);
  for(const m of ["lookup","resolve","resolve4","resolve6"] as const){t.mock.method(dns,m,forbid);t.mock.method(dns.promises,m,forbid);}
  t.mock.method(globalThis,"fetch",forbid);for(const m of ["spawn","spawnSync","exec","execSync","execFile","execFileSync","fork"] as const)t.mock.method(childProcess,m,forbid);

  // Test-only public authority rows exist solely inside the ownership-checked DB.
  // They are NOT production issuer/governance/credential-source implementations.
  await db.$executeRaw`CREATE TABLE native_bootstrap_authority_fixture (id UUID PRIMARY KEY,kind TEXT NOT NULL,body JSONB NOT NULL)`;
  async function sourceWrite<T>(work:(tx:Prisma.TransactionClient)=>Promise<T>){return db.$transaction(async tx=>{
    await tx.$executeRaw`UPDATE ready_source_fence SET revision=revision+1 WHERE id=1`;
    return work(tx);
  },{isolationLevel:"Serializable",timeout:20000,maxWait:10000});}
  async function preparation(work:(tx:Prisma.TransactionClient)=>Promise<void>){await sourceWrite(async tx=>{
    // Fixture insertion only. Adapter and native constraint tests retain origin.
    await tx.$executeRaw`SET LOCAL session_replication_role=replica`;await work(tx);
  });}
  async function snapshot(){const rows=[];
    for(const table of ["worker_bootstrap_tickets","worker_bootstrap_attempts","worker_bootstrap_history","worker_bootstrap_heads","worker_bootstrap_audit","events","ready_source_fence"])
      rows.push(await db.$queryRawUnsafe(`SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb) AS value FROM "${table}" t`));
    return rows;
  }
  async function setup(){
    const f=bootstrapFixture();f.advance(Date.now()-Date.parse(f.iso()));
    f.context.channel.validUntil=f.iso(120000);f.context.channel.profile.certificate.notBefore=f.iso(-3600000);f.context.channel.profile.certificate.notAfter=f.iso(86400000);f.issue();
    let fault="",credentialState:"revoked"|"expired"|undefined;const modes:string[]=[],options:any[]=[];
    const hooks:{afterCommit?:()=>Promise<void>;read?:()=>Promise<void>}={};
    const sourceBody=()=>({...copy(f.context),credentialHighWater:Math.max(f.context.credentialHighWater,f.context.credential?.epoch??0),
      credentialState:f.context.credentialActive?"acknowledged":credentialState??(f.context.credential?"pending":"absent")});
    async function saveContext(){const body=JSON.stringify(sourceBody());await sourceWrite(tx=>tx.$executeRaw`UPDATE native_bootstrap_authority_fixture SET body=${body}::jsonb WHERE id=${f.context.binding.hostId}::uuid`);}
    await preparation(async tx=>{
      const b=f.context.binding;await tx.user.create({data:{id:f.context.ownerId,email:randomUUID()+"@example.test",passwordHash:"synthetic-not-a-login"}});
      await tx.workspace.create({data:{id:b.workspaceId,name:"Synthetic bootstrap qualification",ownerUserId:f.context.ownerId}});
      await tx.agentHost.create({data:{id:b.hostId,workspaceId:b.workspaceId,name:"Inert synthetic host",slug:randomUUID(),platform:"synthetic",status:"online"}});
      await tx.$executeRaw`INSERT INTO native_bootstrap_authority_fixture(id,kind,body) VALUES(${b.hostId}::uuid,'context',${JSON.stringify(sourceBody())}::jsonb)`;
    });
    const fail=(point:string)=>{if(fault===point){fault="";throw Error("synthetic native rollback");}};
    const wrapped=new Proxy(db,{get(target,key){if(key!=="$transaction")return Reflect.get(target,key);
      return (work:any,option:any)=>target.$transaction(async tx=>{
        options.push(option);let stage="read";
        const proxy=new Proxy(tx,{get(target,key){const value=Reflect.get(target,key);
          if(key==="$executeRaw")return async(...args:any[])=>{
            const sql=Array.isArray(args[0])?args[0].join("?").replace(/\s+/g," ").trim():"";
            const result=await (value as any).apply(target,args);
            if(sql==="SET TRANSACTION READ ONLY"){
              modes.push((await tx.$queryRaw<any[]>`SHOW transaction_read_only`)[0].transaction_read_only);await hooks.read?.();
            }
            assert.equal((await tx.$queryRaw<any[]>`SHOW session_replication_role`)[0].session_replication_role,"origin");
            const match=/INSERT INTO worker_bootstrap_(\w+)/.exec(sql);
            if(match){if(match[1]==="tickets")stage="registered";if(match[1]==="history")stage=args[4];fail(match[1]);fail(match[1]+":"+stage);}
            if(sql.startsWith("UPDATE worker_bootstrap_heads")){fail("heads");fail("heads:"+stage);}
            if(sql.startsWith("UPDATE ready_source_fence"))fail("fence");return result;
          };
          if(key==="event")return new Proxy(value,{get(model,key){const fn=Reflect.get(model,key);if(key!=="create")return typeof fn==="function"?fn.bind(model):fn;
            return async(...args:any[])=>{const result=await fn.apply(model,args);fail("event");fail("event:"+stage);return result;};}});
          return typeof value==="function"?value.bind(target):value;
        }});
        const result=await work(proxy);fail("precommit");fail("precommit:"+stage);return result;
      },{...option,maxWait:15000,timeout:30000});
    }});
    const source:BootstrapAuthoritySource={qualification:"synthetic_bootstrap_authority_v1",
      context:async(tx,b)=>{const rows=await tx.$queryRaw<any[]>`SELECT body FROM native_bootstrap_authority_fixture WHERE id=${b.hostId}::uuid AND kind='context'`;return rows[0]?.body??null;},
      decision:async(tx,id)=>{const rows=await tx.$queryRaw<any[]>`SELECT body FROM native_bootstrap_authority_fixture WHERE id=${id}::uuid AND kind='decision'`;return rows[0]?.body??null;},
      ticketRevoked:async(tx,id)=>{const rows=await tx.$queryRaw<any[]>`SELECT body FROM native_bootstrap_authority_fixture WHERE id=${id}::uuid AND kind='ticket'`;return rows[0]?.body.revoked!==false;}};
    const store=createPrismaWorkerBootstrapStore(wrapped,source,()=>new Date(f.iso()));
    const service=createWorkerBootstrapService(store,{qualification:"synthetic_bootstrap_exchange_v1",run:async input=>{
      const response=await f.exchange.run(input);await saveContext();await hooks.afterCommit?.();return response;
    }},()=>new Date(f.iso()));
    async function prepareTicket(){const ticket=f.ticket(),decision=f.decisions.get(ticket.decisionId)!;
      await preparation(async tx=>{
        await tx.decision.create({data:{id:decision.payload.id,workspaceId:ticket.intent.binding.workspaceId,title:"Synthetic bootstrap decision",status:"accepted",source:"synthetic_native_fixture"}});
        await tx.$executeRaw`INSERT INTO native_bootstrap_authority_fixture(id,kind,body) VALUES(${decision.payload.id}::uuid,'decision',${JSON.stringify(decision)}::jsonb)`;
        await tx.$executeRaw`INSERT INTO native_bootstrap_authority_fixture(id,kind,body) VALUES(${ticket.id}::uuid,'ticket','{"revoked":false}'::jsonb)`;
      });
    }
    async function register(){await prepareTicket();return store.register(f.tickets.get(f.ticket().id)!.signed);}
    const heads=()=>db.$queryRaw<any[]>`SELECT * FROM worker_bootstrap_heads WHERE workspace_id=${f.context.binding.workspaceId}::uuid`;
    const history=()=>db.$queryRaw<any[]>`SELECT h.* FROM worker_bootstrap_history h JOIN worker_bootstrap_attempts a ON a.id=h.attempt_id WHERE a.workspace_id=${f.context.binding.workspaceId}::uuid ORDER BY a.generation,h.revision`;
    async function recovery(reason:"revoked"|"expired"|undefined=undefined){const h=(await heads())[0];credentialState=reason;
      Object.assign(f.context,{enrollmentGeneration:h.generation,credentialHighWater:h.credential_epoch,credentialActive:false,
        prior:{attemptId:h.attempt_id,state:reason==="revoked"?"revoked_credential":reason==="expired"?"expired":h.state,credential:copy(f.context.credential)}});
      await saveContext();f.issue("owner_recovery");if(f.ticket().intent.target.fingerprint===f.context.credential?.fingerprint){f.ticket().intent.target.fingerprint=reviewDigest(randomUUID());f.resign();}
      return register();
    }
    return {...f,store,service,source,wrapped,hooks,register,prepareTicket,heads,history,recovery,saveContext,modes,options,fault:(name:string)=>fault=name};
  }

  await t.test("native first enrollment, signed evidence, atomic audit and canonical revoked/expired recovery",async()=>{
    for(const reason of ["revoked","expired"] as const){const f=await setup();await f.register();ok(await f.service.consume(f.input()));const original=await f.history();
      assert.deepEqual(original.map(r=>r.state),["consumed","dispatched","acknowledged"]);assert.ok(original[1].record.peer.signature);assert.ok(original[2].record.completion.signature);
      await f.recovery(reason);ok(await f.service.consume(f.input()));assert.equal((await f.heads())[0].generation,2);assert.deepEqual((await f.history()).slice(0,3),original);
      const audit=await db.$queryRaw<any[]>`SELECT count(*)::int n FROM worker_bootstrap_audit a JOIN worker_bootstrap_tickets t ON t.id=a.ticket_id WHERE t.workspace_id=${f.context.binding.workspaceId}::uuid`;
      assert.equal(audit[0].n,8);
    }
  });
  await t.test("20 native same-ticket consumes and 20 different tickets reserve exactly one generation",async()=>{
    for(const distinct of [false,true]){const f=await setup(),inputs=[];for(let i=0;i<(distinct?20:1);i++){f.issue();await f.register();inputs.push(f.input());}
      if(!distinct)for(let i=1;i<20;i++)inputs.push(f.input());const results=await Promise.all(inputs.map(input=>f.service.consume(input)));
      assert.equal(results.filter(r=>r.ok).length,1,JSON.stringify(results.map((r:any)=>r.error)));assert.equal(f.calls(),1);assert.equal((await f.heads()).length,1);assert.equal((await f.history()).length,3);
    }
  });
  await t.test("20 native completions use one CAS history and one audit",async()=>{
    const f=await setup();await f.register();
    // Execute the real consume but make its completion transaction roll back.
    f.fault("history:acknowledged");const result=no(await f.service.consume(f.input()));assert.equal(result.error,"delivery_unknown");
    // A separate fixture captures a pre-completion point without rewriting history.
    const g=await setup();await g.register();let release!:()=>void;const barrier=new Promise<void>(r=>release=r);let response:any,ready=false;
    const exchange={qualification:"synthetic_bootstrap_exchange_v1" as const,run:async(input:any)=>{response=await g.exchange.run(input);await g.saveContext();ready=true;await barrier;return response;}};
    const pending=createWorkerBootstrapService(g.store,exchange,()=>new Date(g.iso())).consume(g.input());
    for(let n=0;n<200&&!ready;n++)await new Promise(r=>setTimeout(r,5));assert.ok(ready);
    // Save-context transaction may still be finishing; a fresh read fences it.
    const a=(await g.heads())[0];assert.equal(a.state,"dispatched");
    const outcomes=await Promise.allSettled(Array.from({length:20},()=>g.store.transaction(tx=>tx.transition(a.attempt_id,"dispatched","acknowledged",{completion:response.completion}))));
    assert.equal(outcomes.filter(r=>r.status==="fulfilled"&&r.value===true).length,1);
    assert.equal((await g.history()).filter(r=>r.state==="acknowledged").length,1);release();no(await pending);
    assert.equal((await g.heads())[0].state,"delivery_unknown");
  });
  await t.test("real failures at every write/audit/precommit boundary roll back atomically",async()=>{
    for(const point of ["fence","tickets","event","audit","precommit"]){const f=await setup();
      // Prepare references once; registration is the only operation under fault.
      await f.prepareTicket();const before=await snapshot();f.fault(point);await assert.rejects(f.store.register(f.tickets.get(f.ticket().id)!.signed));assert.deepEqual(await snapshot(),before,point);
    }
    for(const point of ["attempts","history:consumed","heads","event:consumed","audit:consumed","precommit:consumed"]){const f=await setup();await f.register();const before=await snapshot();f.fault(point);
      no(await f.service.consume(f.input()));assert.deepEqual(await snapshot(),before,point);assert.equal(f.calls(),0);}
    for(const state of ["dispatched","acknowledged"]){for(const table of ["history","heads","event","audit","precommit"]){const f=await setup();await f.register();f.fault(table+":"+state);
      no(await f.service.consume(f.input()));const rows=await f.history();assert.equal((await f.heads())[0].state,"delivery_unknown");assert.ok(!rows.some(r=>r.state===state));
      const audit=await db.$queryRaw<any[]>`SELECT count(*)::int n FROM worker_bootstrap_audit a JOIN worker_bootstrap_tickets t ON t.id=a.ticket_id WHERE t.workspace_id=${f.context.binding.workspaceId}::uuid`;
      assert.equal(audit[0].n,rows.length+1);}}
  });
  await t.test("SQL read-only status/inspection preserve all ledger, event and fence snapshots",async()=>{
    const f=await setup();await f.register();ok(await f.service.consume(f.input()));const before=await snapshot();
    for(let n=0;n<3;n++)ok(await f.service.status(f.input()));f.advance(60000);no(await f.service.status(f.input()));assert.deepEqual(await snapshot(),before);assert.deepEqual(f.modes.slice(-4),["on","on","on","on"]);
    await assert.rejects(f.store.read(tx=>tx.transition((before[3] as any)[0].value[0].attempt_id,"acknowledged","delivery_unknown")));assert.deepEqual(await snapshot(),before);
    await assert.rejects(db.$transaction(async tx=>{await tx.$executeRaw`SET TRANSACTION READ ONLY`;await tx.$executeRaw`UPDATE ready_source_fence SET revision=revision+1 WHERE id=1`;}));
    assert.deepEqual(await snapshot(),before);
  });
  await t.test("native canonical-source revocation, stale epochs, expiry, replay and ABA deny",async()=>{
    const changes:Array<(f:Awaited<ReturnType<typeof setup>>)=>void>=[f=>f.context.ownerActive=false,f=>f.context.ownerId=randomUUID(),f=>f.context.hostActive=false,f=>f.context.installationActive=false,
      f=>f.context.binding.hostEpoch++,f=>f.context.binding.installationEpoch++,f=>f.context.binding.ticketKeyEpoch++,f=>f.context.channel.revision++,f=>f.context.channel.certificateEpoch++,f=>f.advance(60000)];
    for(const change of changes){const f=await setup();await f.register();change(f);await f.saveContext();const before=await snapshot();no(await f.service.consume(f.input()));assert.equal(f.calls(),0);assert.deepEqual(await snapshot(),before);}
    const f=await setup();await f.register();ok(await f.service.consume(f.input()));no(await f.service.consume(f.input()));await f.recovery("revoked");ok(await f.service.consume(f.input()));
    const first=(await f.history())[0];f.context.prior={attemptId:first.attempt_id,state:"revoked_credential",credential:f.context.credential};f.context.enrollmentGeneration=2;f.context.credentialHighWater=2;f.context.credentialActive=false;
    await f.saveContext();f.issue("owner_recovery");f.ticket().intent.target.fingerprint=pin("9");f.resign();await assert.rejects(f.register());assert.equal((await f.heads())[0].generation,2);
  });
  await t.test("real UNIQUE, FK and CHECK constraints reject native corruption",async()=>{
    const f=await setup();await f.register();ok(await f.service.consume(f.input()));const h=(await f.heads())[0],rows=await f.history();
    const rejects=async(sql:Prisma.Sql)=>assert.rejects(db.$executeRaw(sql),(e:any)=>e.code==="P2010"&&["23503","23505","23514"].includes(e.meta?.code));
    await rejects(Prisma.sql`INSERT INTO worker_bootstrap_heads SELECT * FROM worker_bootstrap_heads WHERE workspace_id=${h.workspace_id}::uuid`);
    await rejects(Prisma.sql`UPDATE worker_bootstrap_heads SET record_digest=${pin("0")} WHERE workspace_id=${h.workspace_id}::uuid`);
    await rejects(Prisma.sql`UPDATE worker_bootstrap_attempts SET generation=0 WHERE id=${h.attempt_id}::uuid`);
    await rejects(Prisma.sql`UPDATE worker_bootstrap_history SET state='consumed' WHERE id=${h.history_id}::uuid`);
    await rejects(Prisma.sql`UPDATE worker_bootstrap_tickets SET owner_id=${randomUUID()}::uuid WHERE workspace_id=${h.workspace_id}::uuid`);
    await rejects(Prisma.sql`UPDATE worker_bootstrap_tickets SET record=jsonb_set(record,'{decision,payload,authority}','"delegated"') WHERE workspace_id=${h.workspace_id}::uuid`);
    await rejects(Prisma.sql`UPDATE worker_bootstrap_attempts SET predecessor_id=${randomUUID()}::uuid WHERE id=${h.attempt_id}::uuid`);
    await rejects(Prisma.sql`DELETE FROM worker_bootstrap_history WHERE id=${rows[0].id}::uuid`);
  });
  await t.test("real shared-fence row locking and RepeatableRead snapshots prevent mixed authority",async()=>{
    const f=await setup();await f.register();let locked!:()=>void,release!:()=>void;const held=new Promise<void>(r=>locked=r),gate=new Promise<void>(r=>release=r);
    const holder=sourceWrite(async tx=>{locked();await gate;await tx.$executeRaw`UPDATE native_bootstrap_authority_fixture SET body=jsonb_set(body,'{hostActive}','false') WHERE id=${f.context.binding.hostId}::uuid`;});await held;
    let finished=false;const consume=f.service.consume(f.input()).then(r=>{finished=true;return r;});let waiting=0;
    try{for(let n=0;n<100&&!waiting;n++){waiting=(await db.$queryRaw<any[]>`SELECT count(*)::int n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%UPDATE ready_source_fence%'`)[0].n;
      if(!waiting)await new Promise(r=>setTimeout(r,5));}assert.ok(waiting>0);assert.equal(finished,false);}finally{release();}
    await holder;no(await consume);assert.equal(f.calls(),0);
    const g=await setup();const old=g.context.binding.hostEpoch;
    await g.store.read(async tx=>{await tx.ticket(g.ticket().id);}); // Missing ticket read is still harmless.
    await g.register();await g.store.read(async tx=>{await tx.ticket(g.ticket().id);const before=await tx.context(g.context.binding);g.context.binding.hostEpoch++;await g.saveContext();
      const after=await tx.context(g.ticket().intent.binding);assert.equal(before!.binding.hostEpoch,old);assert.equal(after!.binding.hostEpoch,old);});
    no(await g.service.consume(g.input()));
  });
  await t.test("post-commit unknown and failed terminal writes remain spent without automatic retry",async()=>{
    for(const point of ["","history:delivery_unknown","heads:delivery_unknown","event:delivery_unknown","audit:delivery_unknown","precommit:delivery_unknown"]){const f=await setup();await f.register();
      f.hooks.afterCommit=async()=>{f.context.ownerActive=false;await f.saveContext();};if(point)f.fault(point);
      assert.equal(no(await f.service.consume(f.input())).error,point?"reconciliation_required":"delivery_unknown");assert.equal((await f.heads())[0].state,point?"dispatched":"delivery_unknown");
      no(await f.service.consume(f.input()));assert.equal(f.calls(),1);
    }
    const f=await setup();await f.register();f.hooks.read=async()=>{f.context.hostActive=false;await f.saveContext();delete f.hooks.read;};no(await f.service.consume(f.input()));assert.equal(f.calls(),0);assert.equal((await f.heads())[0].state,"blocked");
  });
  assert.equal(effects,0);
});
