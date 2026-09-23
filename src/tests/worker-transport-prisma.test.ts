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
import { Prisma } from "@prisma/client";
import { fixture } from "./worker-transport-fixture";
import { createPrismaWorkerTransportStore } from "../modules/api-keys/worker-transport-store";
import { createWorkerTransportService } from "../modules/api-keys/worker-transport.service";
import { workerTicketFingerprint } from "../auth/worker-ticket-principal";
import { reviewDigest } from "../modules/agent-runtime/task-review-contract";
import { persistedSignedTransport } from "../modules/api-keys/worker-transport-persistence-contract";

const copy=<T>(v:T):T=>structuredClone(v),pin=(s:string)=>s.repeat(64);
const ok=(r:any)=>{assert.equal(r.ok,true,r.error);for(const flag of ["transportQualified","implementationReady","executionSupported","pilotReady","liveAdmissionAllowed","pilotExecutionAuthorized","pilotExecutionStarted"])assert.equal(r[flag],false);return r;};
const denied=(r:any)=>assert.equal(r.ok,false);
const conflict=()=>new Prisma.PrismaClientKnownRequestError("synthetic conflict",{code:"P2034",clientVersion:"synthetic"});

// A rollback-capable *mock*, not PostgreSQL concurrency qualification. It checks
// actual Prisma argument shapes/queries and returns snapshots only on commit.
function prismaFixture(){
  let state={generation:[] as any[],history:[] as any[],head:[] as any[],audit:[] as any[],event:[] as any[],fence:0},fault="",cas=false,hideHead=false;
  const f=fixture(()=>{const h=state.history.at(-1);return h?{payload:copy(h.record),signature:h.signature}:null;});
  const keyHash="synthetic-only-hash";f.identity.credentialFingerprint=workerTicketFingerprint(keyHash);
  const source:any={owner:f.context.ownerId,role:"owner",host:"offline",key:{workspaceId:f.identity.workspaceId,installationId:f.identity.installationId,keyId:f.signer.keyId,epoch:1,publicKeyDigest:f.identity.ticketPublicKeyDigest},
    credential:{id:f.identity.credentialId,keyHash,credentialVersion:1,workerBindingEpoch:1,workerInstallationId:f.identity.installationId,active:true,revokedAt:null,expiresAt:new Date(f.iso(86400000)),scopes:["agent-runtime:claim"],boundAgentId:null},
    handoff:{workspaceId:f.identity.workspaceId,hostId:f.identity.hostId,installationId:f.identity.installationId,hostFingerprint:f.identity.hostFingerprint,state:"acknowledged",acknowledgedAt:new Date(f.iso())}};
  const decisions=new Map<string,any>(),calls:any[]=[],options:any[]=[];
  let tail=Promise.resolve();
  const matches=(row:any,w:any):boolean=>Object.entries(w).every(([k,v])=>k==="OR"?(v as any[]).some(x=>matches(row,x)):row[k]===v);
  const client:any={$transaction:async(work:any,opts:any)=>{
    options.push(opts);const wait=tail;let release!:()=>void;tail=new Promise<void>(r=>release=r);await wait;
    const draft=copy(state),fail=(name:string)=>{if(fault===name)throw Error("synthetic rollback");};
    const log=(name:string,args:any)=>{calls.push({name,args:copy(args)});};
    const model=(table:"generation"|"history"|"head"|"audit"|"event")=>({
      create:async({data,select}:any)=>{log(table+".create",{data,select});
        if(table==="head"&&draft.head.some(h=>h.workspaceId===data.workspaceId&&h.hostId===data.hostId))throw conflict();
        if(table==="history"&&draft.history.some(h=>h.requestId===data.requestId||h.decisionId===data.decisionId||h.workspaceId===data.workspaceId&&h.hostId===data.hostId&&h.revision===data.revision))throw conflict();
        const row={...copy(data),...(table==="event"?{id:randomUUID()}:{})};draft[table].push(row);fail(table);return copy(row);},
      findFirst:async(args:any)=>{log(table+".findFirst",args);assert.ok(args.select);return copy(draft[table].find(r=>matches(r,args.where))??null);},
      findUnique:async(args:any)=>{log(table+".findUnique",args);assert.deepEqual(args.include,{history:{include:{generation:true}}});
        if(hideHead)return null;
        const h=draft.head.find(r=>matches(r,args.where.workspaceId_hostId));if(!h)return null;
        const hist=draft.history.find(r=>r.id===h.historyId),gen=draft.generation.find(r=>r.id===hist.generationId);return copy({...h,history:{...hist,generation:gen}});},
      updateMany:async(args:any)=>{log(table+".updateMany",args);assert.equal(table,"head");assert.ok(args.where.recordDigest);assert.ok(args.where.revision);
        if(cas)return {count:0};const row=draft.head.find(r=>matches(r,args.where));if(!row)return {count:0};Object.assign(row,copy(args.data));fail("head");return {count:1};}
    });
    const db:any={workerTransportGeneration:model("generation"),workerTransportHistory:model("history"),workerTransportHead:model("head"),workerTransportAudit:model("audit"),event:model("event"),
      $executeRaw:async(strings:TemplateStringsArray)=>{assert.equal(strings.join(""),"UPDATE ready_source_fence SET revision=revision+1 WHERE id=1");draft.fence++;fail("fence");return 1;},
      workspace:{findUnique:async(a:any)=>{assert.deepEqual(a,{where:{id:f.identity.workspaceId},select:{ownerUserId:true}});return {ownerUserId:source.owner};}},
      agentHost:{findFirst:async(a:any)=>{assert.deepEqual(a.where,{id:f.identity.hostId,workspaceId:f.identity.workspaceId});return {status:source.host};}},
      trustedProviderTicketKey:{findUnique:async(a:any)=>{assert.deepEqual(a.where,{workspaceId:f.identity.workspaceId});return copy(source.key);}},
      apiKey:{findFirst:async(a:any)=>{assert.deepEqual(a.where,{workspaceId:f.identity.workspaceId,workerHostId:f.identity.hostId,workerBindingEpoch:{not:null}});assert.deepEqual(a.orderBy,{workerBindingEpoch:"desc"});assert.equal(a.select.key,undefined);return copy(source.credential);}},
      transportHandoffSource:{findUnique:async(a:any)=>{assert.deepEqual(a.where,{credentialId:source.credential.id});assert.equal(a.select.approvalCommand,undefined);return copy(source.handoff);}},
      workspaceMembership:{findUnique:async(a:any)=>{assert.deepEqual(a.where,{workspaceId_userId:{workspaceId:f.identity.workspaceId,userId:source.owner}});return {role:source.role};}},
      decision:{findFirst:async(a:any)=>{assert.equal(a.where.workspaceId,f.identity.workspaceId);assert.equal(a.where.status,"accepted");
        if(a.where.supersedesId)return decisions.get(a.where.supersedesId)?.superseded?{id:randomUUID()}:null;
        return decisions.has(a.where.id)&&decisions.get(a.where.id).accepted?{id:a.where.id}:null;}},
      transportDecisionRevisionSource:{findUnique:async(a:any)=>copy(decisions.get(a.where.decisionId)?.revision??null)},
      transportDecisionAcceptanceSource:{findUnique:async(a:any)=>copy(decisions.get(a.where.decisionId)?.acceptance??null)}};
    try{const result=await work(db);fail("precommit");state=draft;return result;}finally{release();}
  }};
  const store=createPrismaWorkerTransportStore(client,f.signer,()=>new Date(f.iso())),service=createWorkerTransportService(store,f.signer,()=>new Date(f.iso()));
  const command=(i=f.intent())=>{const c=f.command(i);decisions.set(c.decisionId,{accepted:true,superseded:false,
    revision:{decisionId:c.decisionId,workspaceId:f.identity.workspaceId,version:1,body:{workerTransport:copy(i)}},
    acceptance:{id:randomUUID(),decisionId:c.decisionId,workspaceId:f.identity.workspaceId,actorUserId:source.owner,actorAgentId:null,actorCredentialId:null,authority:{status:"owner_reserved"},createdAt:new Date(f.iso())}});return c;};
  return {...f,source,store,service,command,decisions,create:()=>service.command(f.auth(),command()),state:()=>copy(state),mutate:(fn:(s:typeof state)=>void)=>fn(state),
    fault:(name:string)=>fault=name,cas:()=>cas=true,hideHead:()=>hideHead=true,calls,options,client};
}

test("Prisma transport adapter synthetic transactions (no database or external effects)",async t=>{
  let effects=0;const forbid=()=>{effects++;throw Error("external effect forbidden");};
  for(const method of ["connect","createConnection"] as const)t.mock.method(net,method,forbid);
  t.mock.method(net.Server.prototype,"listen",forbid);t.mock.method(tls,"connect",forbid);
  for(const module of [http,https])for(const method of ["request","get"] as const)t.mock.method(module,method,forbid);
  for(const method of ["lookup","resolve","resolve4","resolve6"] as const){t.mock.method(dns,method,forbid);t.mock.method(dns.promises,method,forbid);}
  t.mock.method(globalThis,"fetch",forbid);
  for(const method of ["spawn","spawnSync","exec","execSync","execFile","execFileSync","fork"] as const)t.mock.method(childProcess,method,forbid);

  await t.test("create, stage, cutover, revoke, new generation keep one head and immutable history",async()=>{
    const f=prismaFixture(),created=ok(await f.create()),original=f.state().history[0];
    ok(await f.service.command(f.auth(),f.command(f.intent("stage"))));f.advance(10001);
    ok(await f.service.command(f.auth(),f.command(f.intent("cutover"))));
    const revoked=ok(await f.service.command(f.auth(),f.command(f.intent("revoke"))));
    denied(await f.service.inspect(revoked.record,revoked.anchor,f.observation(revoked.record.payload)));
    const i=f.intent("create");i.certificateEpoch=3;i.profile.certificate.fingerprint=pin("2");i.profile.bootstrap.fingerprint=pin("2");
    ok(await f.service.command(f.auth(),f.command(i)));
    const state=f.state();assert.equal(state.head.length,1);assert.equal(state.history.length,5);assert.equal(state.audit.length,5);assert.equal(state.event.length,5);
    assert.equal(state.generation.length,2);assert.notEqual(state.history[3].generationId,state.history[4].generationId);assert.deepEqual(state.history[0],original);
    assert.equal(state.head[0].highWaterEpoch,3);assert.equal(state.history[4].previousDigest,reviewDigest(revoked.record));
    assert.equal(created.record.payload.revision,1);assert.ok(f.options.filter(o=>o.isolationLevel==="Serializable").length===5);
  });
  await t.test("inspect and completion use read snapshots without fence, expiry, audit or last-used writes",async()=>{
    const f=prismaFixture(),r=ok(await f.create()),before=f.state(),writes=f.calls.filter(c=>/create|update/.test(c.name)).length;
    const flight=ok(await f.service.inspect(r.record,r.anchor,f.observation(r.record.payload)));ok(await f.service.complete(flight.receipt));
    assert.deepEqual(f.state(),before);assert.equal(f.calls.filter(c=>/create|update/.test(c.name)).length,writes);assert.equal(f.options.at(-1).isolationLevel,"RepeatableRead");
    await assert.rejects(f.store.read!(tx=>tx.append(r.record)),/read_only/);
    f.advance(7200001);denied(await f.service.inspect(r.record,r.anchor,f.observation(r.record.payload)));assert.deepEqual(f.state(),before);
    // Expiry never prevents a fresh owner decision from recording a terminal revoke.
    ok(await f.service.command(f.auth(),f.command(f.intent("revoke"))));
  });
  await t.test("re-admission with a replacement installation/credential never resurrects old generation",async()=>{
    const f=prismaFixture(),r=ok(await f.create());ok(await f.service.command(f.auth(),f.command(f.intent("revoke"))));const old=f.state();
    const installationId=randomUUID(),credentialId=randomUUID();
    Object.assign(f.identity,{installationId,credentialId,credentialVersion:2,credentialEpoch:2});
    Object.assign(f.source.credential,{id:credentialId,workerInstallationId:installationId,credentialVersion:2,workerBindingEpoch:2});
    f.source.handoff.installationId=installationId;f.source.key.installationId=installationId;
    const i=f.intent("create");i.identity=copy(f.identity);i.certificateEpoch=2;i.profile.certificate.fingerprint=pin("7");i.profile.bootstrap.fingerprint=pin("7");
    const admitted=ok(await f.service.command(f.auth(),f.command(i)));ok(await f.service.inspect(admitted.record,admitted.anchor,f.observation(admitted.record.payload)));
    denied(await f.service.inspect(r.record,r.anchor,f.observation(r.record.payload)));
    assert.deepEqual(f.state().generation[0],old.generation[0]);assert.deepEqual(f.state().history.slice(0,2),old.history);
    assert.equal(f.state().head.length,1);assert.equal(f.state().generation.length,2);assert.notEqual(f.state().generation[0].id,f.state().generation[1].id);
  });
  await t.test("twenty concurrent stage/cutover/revoke attempts yield exactly one winner per head",async()=>{
    for(const action of ["stage","cutover","revoke"] as const){const f=prismaFixture();ok(await f.create());
      if(action==="cutover"){ok(await f.service.command(f.auth(),f.command(f.intent("stage"))));f.advance(10001);}
      const before=f.state(),commands=Array.from({length:20},()=>f.command(f.intent(action))),results=await Promise.all(commands.map(c=>f.service.command(f.auth(),c)));
      assert.equal(results.filter(r=>r.ok).length,1);assert.equal(f.state().history.length,before.history.length+1);assert.equal(f.state().audit.length,before.audit.length+1);
      assert.ok(results.filter(r=>!r.ok).every(r=>r.error==="revision_changed"));
    }
  });
  await t.test("faults after generation/history/head/event/audit and before commit roll everything back",async()=>{
    for(const fault of ["fence","generation","history","head","event","audit","precommit"]){const f=prismaFixture(),before=f.state();f.fault(fault);denied(await f.create());assert.deepEqual(f.state(),before,fault);}
    const f=prismaFixture();ok(await f.create());const before=f.state();f.cas();assert.equal((await f.service.command(f.auth(),f.command(f.intent("stage")))).error,"revision_changed");assert.deepEqual(f.state(),before);
    for(const code of ["P2034","P2002"]){const g=prismaFixture();g.client.$transaction=async()=>{throw new Prisma.PrismaClientKnownRequestError("synthetic",{code,clientVersion:"synthetic"});};
      assert.equal((await g.create()).error,"revision_changed");}
    const missingAudit=prismaFixture(),beforeAudit=missingAudit.state();
    const noAudit=createWorkerTransportService({transaction:work=>missingAudit.store.transaction(tx=>work({...tx,audit:async()=>{}}))},missingAudit.signer,()=>new Date(missingAudit.iso()));
    denied(await noAudit.command(missingAudit.auth(),missingAudit.command()));assert.deepEqual(missingAudit.state(),beforeAudit);
    // A second head cannot be committed even if a faulty/racing read misses the
    // existing pointer. Unique history/head constraints reject the whole draft.
    const duplicate=prismaFixture();ok(await duplicate.create());duplicate.hideHead();const beforeDuplicate=duplicate.state();
    const i=duplicate.intent();i.expectedRevision=0;i.expectedDigest=null;i.profile.certificate.fingerprint=pin("9");i.profile.bootstrap.fingerprint=pin("9");
    denied(await duplicate.service.command(duplicate.auth(),duplicate.command(i)));assert.deepEqual(duplicate.state(),beforeDuplicate);
    for(const fault of ["history","head","event","audit","precommit"]){const g=prismaFixture();ok(await g.create());const before=g.state();g.fault(fault);
      denied(await g.service.command(g.auth(),g.command(g.intent("stage"))));assert.deepEqual(g.state(),before,fault);}
  });
  await t.test("exact revision/digest, replay, epochs, historical pins and revoked resurrection deny",async()=>{
    const f=prismaFixture(),cmd=f.command();ok(await f.service.command(f.auth(),cmd));const before=f.state();
    assert.equal((await f.service.command(f.auth(),cmd)).error,"replay");
    for(const patch of [{expectedRevision:0},{expectedDigest:pin("0")},{certificateEpoch:3}]){const i=f.intent("stage");Object.assign(i,patch);denied(await f.service.command(f.auth(),f.command(i)));}
    assert.deepEqual(f.state(),before);
    ok(await f.service.command(f.auth(),f.command(f.intent("revoke"))));const revoked=f.state();
    for(const action of ["stage","cutover","revoke"] as const)denied(await f.service.command(f.auth(),f.command(f.intent(action))));
    const i=f.intent();i.certificateEpoch=2;denied(await f.service.command(f.auth(),f.command(i)));assert.deepEqual(f.state(),revoked);
  });
  await t.test("bounded authoritative sources reject owner, decision, credential, host, installation and issuer drift",async()=>{
    for(const mutate of [(f:any)=>f.source.owner=randomUUID(),(f:any)=>f.source.role="admin",(f:any)=>f.source.host="disabled",
      (f:any)=>f.source.credential.active=false,(f:any)=>f.source.credential.credentialVersion++,(f:any)=>f.source.credential.workerBindingEpoch++,
      (f:any)=>f.source.credential.keyHash="changed",(f:any)=>f.source.credential.expiresAt=new Date(0),(f:any)=>f.source.credential.scopes=["*"],
      (f:any)=>f.source.handoff.state="revoked",(f:any)=>f.source.handoff.hostFingerprint=pin("2"),(f:any)=>f.source.key.installationId=randomUUID(),
      (f:any)=>f.source.key.epoch++,(f:any)=>f.source.key.publicKeyDigest=pin("3")]){
      const f=prismaFixture(),r=ok(await f.create());mutate(f);const before=f.state();denied(await f.service.inspect(r.record,r.anchor,f.observation(r.record.payload)));assert.deepEqual(f.state(),before);
    }
    for(const mutate of [(d:any)=>d.accepted=false,(d:any)=>d.superseded=true,(d:any)=>d.revision.version++,
      (d:any)=>d.acceptance.actorUserId=randomUUID(),(d:any)=>d.acceptance.actorAgentId=randomUUID(),(d:any)=>d.acceptance.actorCredentialId=randomUUID(),
      (d:any)=>d.acceptance.authority.status="delegated",(d:any)=>d.acceptance.createdAt=new Date("2030-01-01"),
      (d:any)=>d.revision.body.workerTransport.profile.bootstrap.evidenceDigest=pin("4"),
      (d:any)=>d.revision.workspaceId=randomUUID(),(d:any)=>d.acceptance.workspaceId=randomUUID()]){
      const f=prismaFixture(),c=f.command();mutate(f.decisions.get(c.decisionId));denied(await f.service.command(f.auth(),c));assert.equal(f.state().history.length,0);
    }
  });
  await t.test("strict serialization rejects unknown and secret fields; persisted rows contain only public projections",async()=>{
    const f=prismaFixture(),r=ok(await f.create());
    for(const mutate of [(v:any)=>v.privateKey="forbidden",(v:any)=>v.payload.ticket="forbidden",(v:any)=>v.payload.identity.secret="forbidden",
      (v:any)=>v.payload.profile.certificate.pem="forbidden",(v:any)=>v.payload.profile.trust.privateKey="forbidden",(v:any)=>v.payload.profile.bootstrap.rawDecision="forbidden"]){
      const forged=copy(r.record);mutate(forged);assert.equal(persistedSignedTransport.safeParse(forged).success,false);
      f.mutate(s=>s.history[0].record=forged.payload);denied(await f.service.inspect(forged,r.anchor,f.observation(r.record.payload)));f.mutate(s=>s.history[0].record=copy(r.record.payload));
    }
    const persisted=JSON.stringify(f.state());for(const forbidden of ["synthetic-only-hash","PRIVATE KEY","rawDecision","signedDecision","approvalCommand","keyHash"])
      assert.equal(persisted.includes(forbidden),false,forbidden);
    f.mutate(s=>s.head[0].recordDigest=pin("0"));denied(await f.service.inspect(r.record,r.anchor,f.observation(r.record.payload)));
  });
  await t.test("new migration is additive with FK/check/index/one-head constraints, composition stays absent",async()=>{
    const sql=readFileSync("prisma/migrations/20260923170000_worker_transport_admission/migration.sql","utf8");
    const statements=sql.replace(/--[^\n]*/g,"").split(";").map(s=>s.trim()).filter(Boolean);
    assert.ok(statements.every(s=>/^(BEGIN|COMMIT|CREATE TABLE|CREATE (?:UNIQUE )?INDEX)\b/.test(s)));
    assert.equal((sql.match(/CREATE TABLE/g)??[]).length,4);
    for(const pattern of [/PRIMARY KEY\(workspace_id,host_id\)/,/previous_revision=revision-1/,/generation_id<>previous_generation_id/,/high_water_epoch BETWEEN previous_high_water/,/REFERENCES events\(id\)/,/REFERENCES worker_transport_history/,/current_pin\)/,/staged_pin\)/,/request_id UUID NOT NULL UNIQUE/,/decision_id UUID NOT NULL UNIQUE/])assert.match(sql,pattern);
    const source=readFileSync("src/modules/api-keys/worker-transport-store.ts","utf8");
    assert.equal((source.match(/\$executeRaw/g)??[]).length,1);assert.doesNotMatch(source,/\$queryRaw|\$executeRawUnsafe|findMany|\.delete\(|\.upsert\(/);
    assert.doesNotMatch(readFileSync("src/app.ts","utf8"),/createPrismaWorkerTransportStore/);
    denied(await createWorkerTransportService().command(prismaFixture().auth(),{}));assert.equal(effects,0);
  });
});
