import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import net from "node:net";
import tls from "node:tls";
import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import childProcess from "node:child_process";
import { bootstrapFixture } from "./worker-bootstrap-fixture";
import { createPrismaWorkerBootstrapStore,type BootstrapAuthoritySource } from "../modules/api-keys/worker-bootstrap-store";
import { createWorkerBootstrapService,type BootstrapAttempt } from "../modules/api-keys/worker-bootstrap.service";
import { reviewDigest } from "../modules/agent-runtime/task-review-contract";
import { persistedBootstrapTicket } from "../modules/api-keys/worker-bootstrap-persistence-contract";

const clone=<T>(v:T):T=>structuredClone(v),pin=(s:string)=>s.repeat(64);
const ok=(r:any)=>{assert.equal(r.ok,true,r.error);for(const key of ["implementationReady","executionSupported","pilotReady","liveAdmissionAllowed","pilotExecutionAuthorized","pilotExecutionStarted","transportQualified","launchAuthority"])assert.equal(r[key],false);return r;};
const no=(r:any)=>{assert.equal(r.ok,false);return r;};
const migration="prisma/migrations/20260923190000_worker_bootstrap_ledger/migration.sql";

// Deliberately serialized rollback-capable SQL-shape mock, NOT PostgreSQL proof.
function fixture(){
  const f=bootstrapFixture();let state={tickets:[] as any[],attempts:[] as any[],history:[] as any[],heads:[] as any[],audit:[] as any[],events:[] as any[],fence:0};
  let tail=Promise.resolve(),fault="",cas=false,contexts=0,credentialState:"revoked"|"expired"|undefined;
  const hooks:{context?:()=>void;read?:()=>void;event?:(state:string)=>void}={},options:any[]=[],queries:string[]=[],issueTimes:(string|undefined)[]=[];
  const fail=(name:string)=>{if(fault===name){fault="";throw Error("sensitive native error must not escape");}};
  const client:any={$transaction:async(work:any,option:any)=>{
    options.push(option);const before=tail;let release!:()=>void;tail=new Promise<void>(r=>release=r);await before;
    const draft=clone(state);let readOnly=false;const initial=JSON.stringify(draft);
    const write=()=>{assert.equal(readOnly,false);};
    const db:any={
      $executeRaw:async(strings:TemplateStringsArray,...values:any[])=>{
        const sql=strings.join("?").replace(/\s+/g," ").trim();queries.push(sql);
        if(sql==="SET TRANSACTION READ ONLY"){readOnly=true;hooks.read?.();return 0;}
        write();if(sql==="UPDATE ready_source_fence SET revision=revision+1 WHERE id=1"){draft.fence++;fail("fence");return 1;}
        if(sql.startsWith("UPDATE worker_bootstrap_heads")){
          const [attempt_id,history_id,generation,credential_epoch,revision,record_digest,s,workspace_id,host_id,previous,digest]=values;
          if(cas){cas=false;return 0;}const h=draft.heads.find(x=>x.workspace_id===workspace_id&&x.host_id===host_id&&x.history_id===previous&&x.record_digest===digest);if(!h)return 0;
          Object.assign(h,{attempt_id,history_id,generation,credential_epoch,revision,record_digest,state:s});fail("heads");fail("heads:"+s);return 1;
        }
        const match=/^INSERT INTO worker_bootstrap_(\w+)\(([^)]+)\)/.exec(sql);assert.ok(match,sql);
        const table=match![1] as "tickets"|"attempts"|"history"|"heads"|"audit",columns=match![2].split(",");assert.equal(values.length,columns.length);
        const row=Object.fromEntries(columns.map((k,i)=>[k,k==="record"?JSON.parse(values[i]):values[i]]));
        assert.ok(!draft[table].some(x=>x.id&&x.id===row.id));
        if(table==="tickets")assert.ok(!draft.tickets.some(x=>x.decision_id===row.decision_id||x.request_id===row.request_id||x.target_id===row.target_id||x.ticket_digest===row.ticket_digest));
        if(table==="attempts"){
          assert.ok(!draft.attempts.some(x=>x.ticket_id===row.ticket_id||x.workspace_id===row.workspace_id&&x.host_id===row.host_id&&(x.generation===row.generation||x.credential_epoch===row.credential_epoch)));
          const ticket=draft.tickets.find(x=>x.id===row.ticket_id);assert.ok(ticket);assert.equal(ticket.generation,row.generation);assert.equal(ticket.predecessor_id,row.predecessor_id);
          if(row.predecessor_id)assert.ok(draft.attempts.some(x=>x.id===row.predecessor_id&&x.generation===row.generation-1&&x.workspace_id===row.workspace_id&&x.host_id===row.host_id));
        }
        if(table==="history")assert.ok(!draft.history.some(x=>x.attempt_id===row.attempt_id&&x.revision===row.revision));
        if(table==="heads")assert.ok(!draft.heads.some(x=>x.workspace_id===row.workspace_id&&x.host_id===row.host_id));
        if(table==="audit")assert.ok(!draft.audit.some(x=>x.event_id===row.event_id||(row.history_id?x.history_id===row.history_id:x.ticket_id===row.ticket_id&&x.history_id===null)));
        draft[table].push(row);fail(table);fail(table+":"+(row.state??draft.history.find(x=>x.id===row.history_id)?.state??"registered"));return 1;
      },
      $queryRaw:async(strings:TemplateStringsArray,...values:any[])=>{
        const sql=strings.join("?").replace(/\s+/g," ").trim();queries.push(sql);const match=/FROM worker_bootstrap_(\w+)/.exec(sql);assert.ok(match,sql);
        const table=match![1] as "tickets"|"attempts"|"history"|"heads";
        let rows=draft[table];
        if(sql.includes("WHERE workspace_id="))rows=rows.filter(x=>x.workspace_id===values[0]&&x.host_id===values[1]);
        else if(sql.includes("WHERE ticket_id="))rows=rows.filter(x=>x.ticket_id===values[0]);
        else if(sql.includes("WHERE attempt_id="))rows=rows.filter(x=>x.attempt_id===values[0]);
        else rows=rows.filter(x=>x.id===values[0]);
        if(sql.includes("ORDER BY revision DESC"))rows=[...rows].sort((a,b)=>b.revision-a.revision);
        if(sql.includes("LIMIT 1"))rows=rows.slice(0,1);return clone(rows);
      },
      event:{create:async({data}:any)=>{write();const row={id:randomUUID(),...clone(data)};draft.events.push(row);hooks.event?.(data.payload.state);fail("events");fail("events:"+data.payload.state);return {id:row.id};}}
    };
    try{const result=await work(db);fail("precommit");const stage=draft.history.length>state.history.length?draft.history.at(-1).state:draft.tickets.length>state.tickets.length?"registered":"read";fail("precommit:"+stage);
      if(readOnly)assert.equal(JSON.stringify(draft),initial);state=draft;return result;}finally{release();}
  }};
  const source:BootstrapAuthoritySource={qualification:"synthetic_bootstrap_authority_v1",
    context:async(db,_binding,issuedAt)=>{assert.ok(db.$queryRaw);issueTimes.push(issuedAt);contexts++;hooks.context?.();return {...clone(f.context),credentialHighWater:Math.max(f.context.credentialHighWater,f.context.credential?.epoch??0),
      credentialState:f.context.credentialActive?"acknowledged":credentialState??(f.context.credential?"pending":"absent")};},
    decision:async(_db,id)=>clone(f.decisions.get(id)??null),ticketRevoked:async(_db,id)=>f.tickets.get(id)?.revoked??true};
  const store=createPrismaWorkerBootstrapStore(client,source,()=>new Date(f.iso())),service=createWorkerBootstrapService(store,f.exchange,()=>new Date(f.iso()));
  const register=()=>store.register(f.tickets.get(f.ticket().id)!.signed);
  const recovery=(reason:"revoked"|"expired"|undefined=undefined)=>{
    const h=state.heads[0];assert.ok(h);f.context.enrollmentGeneration=h.generation;f.context.credentialHighWater=h.credential_epoch;f.context.credentialActive=false;credentialState=reason;
    f.context.prior={attemptId:h.attempt_id,state:reason==="revoked"?"revoked_credential":reason==="expired"?"expired":h.state,credential:clone(f.context.credential)};
    f.issue("owner_recovery");return register();
  };
  return {...f,store,service,source,client,register,recovery,options,queries,hooks,issueTimes,contexts:()=>contexts,state:()=>clone(state),
    mutate:(work:(value:typeof state)=>void)=>work(state),fail:(s:string)=>fault=s,cas:()=>cas=true,exchangeHooks:f.hooks};
}

test("durable bootstrap adapter uses only a transactional mock and has no external effects",async t=>{
  let effects=0;const forbid=()=>{effects++;throw Error("external effects forbidden");};
  for(const m of ["connect","createConnection"] as const)t.mock.method(net,m,forbid);t.mock.method(net.Server.prototype,"listen",forbid);t.mock.method(tls,"connect",forbid);
  for(const module of [http,https])for(const m of ["request","get"] as const)t.mock.method(module,m,forbid);
  for(const m of ["lookup","resolve","resolve4","resolve6"] as const){t.mock.method(dns,m,forbid);t.mock.method(dns.promises,m,forbid);}
  t.mock.method(globalThis,"fetch",forbid);for(const m of ["spawn","spawnSync","exec","execSync","execFile","execFileSync","fork"] as const)t.mock.method(childProcess,m,forbid);
  const logs:unknown[]=[];for(const m of ["log","warn","error"] as const)t.mock.method(console,m,(...v:unknown[])=>logs.push(v));

  await t.test("first enrollment persists immutable ticket, generation, peer, completion and atomic audit",async()=>{
    const f=fixture();await f.register();const ticket=f.state().tickets[0];ok(await f.service.consume(f.input()));const s=f.state();
    assert.deepEqual(s.tickets[0],ticket);assert.equal(s.attempts.length,1);assert.deepEqual(s.history.map(h=>h.state),["consumed","dispatched","acknowledged"]);
    assert.equal(s.audit.length,4);assert.equal(s.events.length,4);assert.ok(s.history[1].record.peer.signature);assert.ok(s.history[2].record.completion.signature);
    assert.ok(f.options.some(o=>o.isolationLevel==="Serializable"));assert.ok(!JSON.stringify(s).includes("synthetic-bootstrap-wire-only"));
  });
  await t.test("issuer selection receives the selected ticket issue-time on every later ceremony check",async()=>{
    const f=fixture(),issuedAt=f.ticket().issuedAt;await f.register();f.issueTimes.length=0;f.advance(1000);
    ok(await f.service.consume(f.input()));assert.ok(f.issueTimes.length>1);assert.ok(f.issueTimes.every(at=>at===issuedAt));assert.notEqual(issuedAt,f.iso());
  });
  await t.test("recovery uses canonical terminal predecessor and fresh IDs without reactivating revoked infrastructure",async()=>{
    for(const reason of ["revoked","expired"] as const){const f=fixture();await f.register();ok(await f.service.consume(f.input()));const old=f.state();
      await f.recovery(reason);ok(await f.service.consume(f.input()));assert.equal(f.state().heads[0].generation,2);assert.equal(f.state().attempts[1].predecessor_id,old.attempts[0].id);
      assert.deepEqual(f.state().history.slice(0,3),old.history);assert.notEqual(f.state().tickets[0].decision_id,f.state().tickets[1].decision_id);}
    for(const key of ["hostActive","installationActive"] as const){const f=fixture();await f.register();ok(await f.service.consume(f.input()));f.context[key]=false;
      await assert.rejects(f.recovery("revoked"));assert.equal(f.context[key],false);assert.equal(f.state().attempts.length,1);}
  });
  await t.test("wrong owner, revoked, stale epochs and expiry deny registration or consumption",async()=>{
    const changes:Array<(f:ReturnType<typeof fixture>)=>void>=[f=>f.context.ownerActive=false,f=>f.context.ownerId=randomUUID(),f=>f.context.hostActive=false,f=>f.context.installationActive=false,
      f=>f.context.binding.hostEpoch++,f=>f.context.binding.installationEpoch++,f=>f.context.binding.ticketKeyEpoch++,f=>f.context.channel.revision++,f=>f.context.channel.certificateEpoch++,
      f=>f.context.channel.highWaterEpoch++,f=>f.advance(60000),f=>f.tickets.get(f.ticket().id)!.revoked=true,f=>{f.decision().state="revoked";f.resign();}];
    for(const change of changes){const a=fixture();change(a);await assert.rejects(a.register());assert.equal(a.state().tickets.length,0);
      const b=fixture();await b.register();change(b);no(await b.service.consume(b.input()));assert.equal(b.calls(),0);assert.equal(b.state().attempts.length,0);}
  });
  await t.test("ticket/decision/request replay and 20 concurrent consumes have a single winner",async()=>{
    const f=fixture();await f.register();const before=f.state();await assert.rejects(f.register());assert.deepEqual(f.state(),before);
    const results=await Promise.all(Array.from({length:20},()=>f.service.consume(f.input())));assert.equal(results.filter(r=>r.ok).length,1);assert.equal(f.calls(),1);assert.equal(f.state().attempts.length,1);
    no(await f.service.consume(f.input()));assert.equal(f.calls(),1);
    for(const key of ["decision","request"]){const g=fixture();await g.register();const prior=clone(g.ticket());g.issue();
      if(key==="decision"){g.ticket().decisionId=prior.decisionId;g.decision().id=prior.decisionId;}else g.ticket().intent.requestId=prior.intent.requestId;
      g.resign();await assert.rejects(g.register());assert.equal(g.state().tickets.length,1);}
  });
  await t.test("20 independent tickets cannot reserve the same generation twice",async()=>{
    const f=fixture(),inputs=[];for(let i=0;i<20;i++){f.issue();await f.register();inputs.push(f.input());}
    const results=await Promise.all(inputs.map(input=>f.service.consume(input)));assert.equal(results.filter(r=>r.ok).length,1);assert.equal(f.state().attempts.length,1);assert.equal(f.state().heads.length,1);assert.equal(f.calls(),1);
  });
  await t.test("concurrent completion has one immutable transition and one audit",async()=>{
    const f=fixture();await f.register();ok(await f.service.consume(f.input()));
    const ack=f.state().history.at(-1),attempt=f.state().attempts[0];
    // Restore only the mock to the exact pre-completion snapshot, to race the real adapter CAS.
    f.mutate(s=>{s.history.pop();const h=s.history.at(-1);Object.assign(s.heads[0],{history_id:h.id,revision:h.revision,record_digest:h.record_digest,state:h.state});
      const audit=s.audit.pop();s.events=s.events.filter(e=>e.id!==audit.event_id);});const before=f.state();
    const results=await Promise.allSettled(Array.from({length:20},()=>f.store.transaction(tx=>tx.transition(attempt.id,"dispatched","acknowledged",{completion:ack.record.completion}))));
    assert.equal(results.filter(r=>r.status==="fulfilled"&&r.value===true).length,1);assert.equal(f.state().history.length,before.history.length+1);assert.equal(f.state().audit.length,before.audit.length+1);
    assert.equal(await f.store.transaction(tx=>tx.transition(attempt.id,"dispatched","acknowledged",{completion:ack.record.completion})),false);
  });
  await t.test("rollback at registration, reservation, send, completion, event, audit and commit is atomic",async()=>{
    for(const phase of ["fence","tickets","events","audit","precommit"]){const f=fixture(),before=f.state();f.fail(phase);await assert.rejects(f.register());assert.deepEqual(f.state(),before,phase);}
    for(const phase of ["attempts","history:consumed","heads","events:consumed","audit:consumed","precommit:consumed"]){const f=fixture();await f.register();const before=f.state();f.fail(phase);
      no(await f.service.consume(f.input()));assert.deepEqual(f.state(),before,phase);assert.equal(f.calls(),0);}
    for(const state of ["dispatched","acknowledged"]){for(const phase of ["history","heads","events","audit","precommit"]){const f=fixture();await f.register();f.fail(phase+":"+state);no(await f.service.consume(f.input()));
      const s=f.state();assert.equal(s.heads[0].state,"delivery_unknown");assert.ok(!s.history.some(h=>h.state===state));assert.equal(s.events.length,s.audit.length);assert.equal(s.audit.length,s.history.length+1);}}
    const f=fixture();await f.register();f.cas();no(await f.service.consume(f.input()));assert.equal(f.state().heads[0].state,"delivery_unknown");
    for(const phase of ["history","heads","events","audit","precommit"]){const g=fixture();await g.register();g.exchangeHooks.after=()=>g.context.ownerActive=false;
      g.fail(phase+":delivery_unknown");assert.equal(no(await g.service.consume(g.input())).error,"reconciliation_required");
      assert.equal(g.state().heads[0].state,"dispatched");assert.equal(g.state().history.length,2);assert.equal(g.state().audit.length,3);no(await g.service.consume(g.input()));assert.equal(g.calls(),1);}
  });
  await t.test("read purity includes status, expired inspect and write attempts through a read transaction",async()=>{
    const f=fixture();await f.register();ok(await f.service.consume(f.input()));const before=f.state();for(let i=0;i<5;i++)ok(await f.service.status(f.input()));
    assert.deepEqual(f.state(),before);f.advance(60000);no(await f.service.status(f.input()));assert.deepEqual(f.state(),before);
    await assert.rejects(f.store.read(tx=>tx.transition(before.attempts[0].id,"acknowledged","delivery_unknown")));assert.deepEqual(f.state(),before);
    assert.ok(f.queries.includes("SET TRANSACTION READ ONLY"));
  });
  await t.test("immutable bindings, missing head, tampered records and ABA predecessors fail closed",async()=>{
    for(const change of [(s:any)=>s.tickets[0].record.signed.payload.ownerId=randomUUID(),(s:any)=>s.tickets[0].binding_digest=pin("0"),
      (s:any)=>s.tickets[0].record.extra="synthetic-secret",(s:any)=>s.tickets[0].record.decision.payload.authority="delegated"]){const f=fixture();await f.register();f.mutate(change);no(await f.service.consume(f.input()));assert.equal(f.calls(),0);}
    const f=fixture();await f.register();ok(await f.service.consume(f.input()));f.mutate(s=>s.heads=[]);no(await f.service.status(f.input()));await assert.rejects(async()=>f.recovery("revoked"));
    const g=fixture();await g.register();ok(await g.service.consume(g.input()));await g.recovery("revoked");ok(await g.service.consume(g.input()));
    g.context.credentialActive=false;g.context.enrollmentGeneration=2;g.context.credentialHighWater=2;g.context.prior={attemptId:g.state().attempts[0].id,state:"revoked_credential",credential:g.context.credential};
    g.issue("owner_recovery");g.ticket().intent.target.fingerprint=pin("9");g.resign();await assert.rejects(g.register());assert.equal(g.state().attempts.length,2);
    const rollback:Array<(x:ReturnType<typeof fixture>)=>void>=[x=>x.context.binding.hostEpoch--,x=>x.context.binding.installationEpoch--,x=>x.context.binding.ticketKeyEpoch--,
      x=>x.context.channel.revision--,x=>x.context.channel.certificateEpoch--,x=>x.context.binding.hostFingerprint=pin("0"),x=>x.context.binding.installationId=randomUUID()];
    for(const change of rollback){const x=fixture();Object.assign(x.context.binding,{hostEpoch:2,installationEpoch:2,ticketKeyEpoch:2});Object.assign(x.context.channel,{revision:2,certificateEpoch:2,highWaterEpoch:2});
      x.issue();await x.register();ok(await x.service.consume(x.input()));change(x);await assert.rejects(x.recovery("revoked"));assert.equal(x.state().attempts.length,1);}
  });
  await t.test("pre-send drift means zero exchange; post-commit unknown cannot retry and can only recover freshly",async()=>{
    const before=fixture();await before.register();before.hooks.read=()=>before.context.hostActive=false;no(await before.service.consume(before.input()));assert.equal(before.calls(),0);assert.equal(before.state().heads[0].state,"blocked");
    const after=fixture();await after.register();after.exchangeHooks.after=()=>after.context.ownerActive=false;no(await after.service.consume(after.input()));assert.equal(after.state().heads[0].state,"delivery_unknown");
    const calls=after.calls();no(await after.service.consume(after.input()));assert.equal(after.calls(),calls);
    delete after.exchangeHooks.after;after.context.ownerActive=true;await after.recovery();ok(await after.service.consume(after.input()));assert.equal(after.state().heads[0].generation,2);
    const late=fixture();await late.register();late.hooks.event=state=>{if(state==="acknowledged")late.advance(60000);};no(await late.service.consume(late.input()));
    assert.equal(late.state().heads[0].state,"delivery_unknown");assert.ok(!late.state().history.some(h=>h.state==="acknowledged"));
  });
  await t.test("missing authority source, malformed public records and secret fields cannot be persisted",async()=>{
    const f=fixture();const missing=createPrismaWorkerBootstrapStore(f.client,undefined as any);await assert.rejects(missing.register(f.tickets.get(f.ticket().id)!.signed));assert.equal(f.state().tickets.length,0);
    const row={signed:f.tickets.get(f.ticket().id)!.signed,decision:f.decisions.get(f.decision().id)};assert.ok(persistedBootstrapTicket.safeParse(row).success);
    assert.equal(persistedBootstrapTicket.safeParse({...row,rawCredential:"synthetic"}).success,false);
    const bad=clone(row.signed);(bad.payload.intent as any).headers={authorization:"synthetic"};await assert.rejects(f.store.register(bad));assert.equal(f.state().tickets.length,0);
  });
  await t.test("migration is CREATE-only, unapplied source with uniqueness, FK, chain and CAS constraints",()=>{
    const sql=readFileSync(migration,"utf8").replace(/--[^\n]*/g,"");assert.equal((sql.match(/CREATE TABLE/g)??[]).length,5);
    assert.doesNotMatch(sql.replace(/ON DELETE RESTRICT/g,""),/\b(?:DROP|ALTER|TRUNCATE|DELETE|UPDATE|INSERT|GRANT|COPY)\b/i);
    for(const fragment of ["UNIQUE(workspace_id,host_id,generation)","UNIQUE(workspace_id,host_id,credential_epoch)","UNIQUE(attempt_id,revision)","previous_generation","owner_reserved","ON DELETE RESTRICT","delivery_unknown"])
      assert.ok(sql.includes(fragment),fragment);
  });
  assert.equal(effects,0);assert.deepEqual(logs,[]);
});
