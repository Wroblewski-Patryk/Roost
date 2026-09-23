import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID,createHash } from "node:crypto";
import net from "node:net";
import tls from "node:tls";
import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import childProcess from "node:child_process";
import { fixture } from "./worker-transport-fixture";
import { createWorkerHandoffCoordinator } from "../modules/api-keys/worker-handoff-coordinator";
import { createWorkerHandoffHttpsClient,type AdmissionHttpsExchange } from "../modules/api-keys/worker-handoff-https";
import { reviewDigest } from "../modules/agent-runtime/task-review-contract";

const pin=(s:string)=>s.repeat(64),copy=<T>(v:T):T=>structuredClone(v);
const secret="synthetic-delivery-"+"x".repeat(48);
const ok=(r:any)=>{assert.equal(r.ok,true,r.error);for(const n of ["transportQualified","implementationReady","executionSupported","pilotReady","liveAdmissionAllowed","pilotExecutionAuthorized","pilotExecutionStarted"])assert.equal(r[n],false);return r;};
const denied=(r:any)=>{assert.equal(r.ok,false);assert.equal(r.transportQualified,false);};
async function setup(){
  const f=fixture();ok(await f.create());
  const events:string[]=[],responses:Buffer[]=[],payloads:Buffer[]=[],operations:any[]=[],states=new Map<string,string>();
  const hooks:{inspect?:()=>Promise<void>;beforePeer?:()=>Promise<void>;afterCommit?:()=>Promise<void>;peer?:any;complete?:any;response?:any;next?:boolean;skipPeer?:boolean;raw?:Buffer;timeout?:boolean}={};
  let calls=0,commits=0,inspections=0;
  const head=()=>f.ledger().history.at(-1)!;
  const current=async()=>{const record=head();return {record,anchor:{identity:record.payload.identity,revision:record.payload.revision,recordDigest:reviewDigest(record),certificateEpoch:record.payload.certificateEpoch,highWaterEpoch:record.payload.highWaterEpoch}};};
  const driver:AdmissionHttpsExchange={qualification:"synthetic_persisted_admission_v1",exchange:async input=>{
    calls++;events.push("transport");payloads.push(input.body);operations.push(input.operation);assert.equal(Object.isFrozen(input.snapshot.identity),true);assert.equal(input.snapshot.sessionReuse,false);
    await hooks.beforePeer?.();
    const selected=hooks.next?input.snapshot.allowedCertificates.at(-1)!:input.snapshot.allowedCertificates[0],r=head().payload;
    const evidence=(phase:"before_send"|"complete",responseDigest:string|null)=>f.seal("observation",{
      ...f.observation(r,{identity:input.snapshot.identity,origin:input.snapshot.origin,serverName:input.snapshot.serverName,caDigest:input.snapshot.caDigest,
        pin:selected.certificate.fingerprint,certificateNotBefore:selected.certificate.notBefore,certificateNotAfter:selected.certificate.notAfter}).payload,
      operation:input.operation,phase,certificateEpoch:selected.epoch,outcome:phase==="before_send"?"before_send":"response",responseDigest,commitUncertain:false,
      ...(phase==="before_send"?hooks.peer:hooks.complete)
    });
    if(!hooks.skipPeer&&!await input.verifyPeer(evidence("before_send",null)))throw Error("peer denied");
    commits++;events.push("commit");
    if(hooks.timeout)throw Error("synthetic timeout after possible commit");
    const wire=JSON.parse(input.body.toString()),id=wire.requestId,action=input.operation.action;
    const base={requestId:id,state:"approved",deliverySpent:false,qualification:"synthetic_memory_only",transportQualified:false,realProvisioningQualified:false,launchAuthority:false};
    let data:any=base;
    if(action==="request"){states.set(id,"approved");data={...base,state:"requested",userCode:"ABCDEF12",binding:{requestId:id,requestDigest:pin("a"),hostFingerprint:wire.hostFingerprint,origin:wire.origin,certificateFingerprint:wire.certificateFingerprint,replacesRequestId:null},expiresAt:f.iso(120000)};}
    if(action==="poll"){states.set(id,"awaiting_ack");data={...base,state:"awaiting_ack",deliverySpent:true,key:secret,responseDigest:pin("a"),ackDeadline:f.iso(60000),
      credential:{id:randomUUID(),workspaceId:wire.workspaceId,installationId:wire.installationId,hostId:wire.hostId,version:1,epoch:1,fingerprint:pin("b"),active:false,revokedAt:null,expiresAt:f.iso(3600000),scopes:["agent-runtime:claim"]}};}
    if(action==="ack"){states.set(id,"acknowledged");data={...base,state:"acknowledged",deliverySpent:true};}
    if(action==="status")data={...base,state:states.get(id)??"approved",deliverySpent:states.get(id)==="acknowledged"};
    const body=hooks.raw??Buffer.from(JSON.stringify({data}));responses.push(body);
    const responseDigest=createHash("sha256").update(body).digest("hex");
    await hooks.afterCommit?.();
    return {statusCode:200,headers:{"content-type":"application/json","content-length":String(body.length)},body,peer:evidence("complete",responseDigest),...hooks.response};
  }};
  const client=createWorkerHandoffHttpsClient(undefined,driver);
  const admission={inspect:async(...args:Parameters<typeof f.service.inspect>)=>{events.push("inspect");const r=await f.service.inspect(...args);if(++inspections===1)await hooks.inspect?.();return r;},
    completeVerified:async(...args:Parameters<typeof f.service.completeVerified>)=>{events.push(args[3]);return f.service.completeVerified(...args);}};
  const dependencies={current,admission,https:client},coordinator=createWorkerHandoffCoordinator(dependencies);
  const body=(requestId:string=randomUUID())=>({requestId,workspaceId:f.identity.workspaceId,installationId:f.identity.installationId,hostId:f.identity.hostId,hostFingerprint:f.identity.hostFingerprint});
  const proof=(requestId:string=randomUUID())=>({...body(requestId),deviceSecret:Buffer.alloc(48,1),challenge:Buffer.alloc(48,2)});
  const request=(requestId:string=randomUUID())=>({...body(requestId),deviceSecretHash:pin("a"),challengeHash:pin("b"),replacesRequestId:null});
  const ack=(requestId:string)=>({...proof(requestId),credentialId:randomUUID(),credentialFingerprint:pin("b"),responseDigest:pin("a"),ackProof:pin("c")});
  return {...f,head,current,coordinator,client,dependencies,driver,hooks,events,responses,payloads,operations,proof,request,ack,calls:()=>calls,commits:()=>commits};
}

test("persisted admission coordinates the HTTPS handoff boundary without external effects",async t=>{
  let effects=0;const forbid=()=>{effects++;throw Error("external effect forbidden");};
  for(const m of ["connect","createConnection"] as const)t.mock.method(net,m,forbid);
  t.mock.method(net.Server.prototype,"listen",forbid);t.mock.method(tls,"connect",forbid);
  for(const module of [http,https])for(const m of ["request","get"] as const)t.mock.method(module,m,forbid);
  for(const m of ["lookup","resolve","resolve4","resolve6"] as const){t.mock.method(dns,m,forbid);t.mock.method(dns.promises,m,forbid);}
  t.mock.method(globalThis,"fetch",forbid);
  for(const m of ["spawn","spawnSync","exec","execSync","execFile","execFileSync","fork"] as const)t.mock.method(childProcess,m,forbid);
  const secretBuffers:Buffer[]=[],from=Buffer.from;
  t.mock.method(Buffer,"from",((...args:any[])=>{const b=(from as any)(...args);if(args[0]===secret)secretBuffers.push(b);return b;}) as any);
  const logs:string[]=[];for(const m of ["log","warn","error"] as const)t.mock.method(console,m,(...args:unknown[])=>logs.push(args.join(" ")));

  await t.test("request/poll/ACK/status use exact inspect, transport, peer recheck, completion order",async()=>{
    const f=await setup(),id=randomUUID();ok(await f.coordinator.send("request",f.request(id)));
    const result=ok(await f.coordinator.send("poll",f.proof(id)));assert.ok(Buffer.isBuffer(result.data.key));assert.equal(result.data.key.toString(),secret);result.data.key.fill(0);
    ok(await f.coordinator.send("ack",f.ack(id)));ok(await f.coordinator.send("status",f.proof(id)));
    assert.deepEqual(f.events,Array.from({length:4},()=>["inspect","inspect","transport","before_send","commit","complete"]).flat());
    assert.ok(f.payloads.concat(f.responses).every(b=>b.every(v=>v===0)));
  });
  await t.test("caller URL/pin/CA/epoch/proxy/resolver/snapshot and extra-argument overrides deny before transport",async()=>{
    const f=await setup();for(const patch of [{origin:"https://other.example.com:443"},{certificateFingerprint:pin("0")},{ca:"x"},{epoch:2},{proxy:true},{resolverPolicy:"override"},{snapshot:{}},{headers:{Authorization:secret}}])
      denied(await f.coordinator.send("request",{...f.request(),...patch}));
    denied(await f.coordinator.send("status",f.proof(),{}));assert.equal(f.calls(),0);
    for(const action of ["direct_codex","app_server","manual","GET","approve"])denied(await f.coordinator.send(action,f.proof()));assert.equal(f.calls(),0);
  });
  const drifts=[async(f:any)=>{ok(await f.service.command(f.auth(),f.command(f.intent("revoke"))));},
    async(f:any)=>{ok(await f.service.command(f.auth(),f.command(f.intent("stage"))));},
    async(f:any)=>{f.context.identity.credentialEpoch++;},async(f:any)=>{f.context.hostActive=false;},async(f:any)=>{f.context.identity.installationId=randomUUID();},
    async(f:any)=>{f.context.identity.hostId=randomUUID();},async(f:any)=>{f.context.ownerId=randomUUID();},
    async(f:any)=>{f.context.identity.ticketKeyEpoch++;},async(f:any)=>{const r=f.head().payload,d=f.decisions.get(r.decisionId);f.decisions.set(r.decisionId,f.seal("decision",{...d.payload,state:"revoked"}));},
    async(f:any)=>{f.advance(7200001);}];
  await t.test("all authority/head/expiry drift during preparation denies with zero transport calls",async()=>{
    for(const drift of drifts){const f=await setup();f.hooks.inspect=()=>drift(f);denied(await f.coordinator.send("status",f.proof()));assert.equal(f.calls(),0);}
  });
  await t.test("drift after possible commit rejects secret, ACK and status; no automatic retry",async()=>{
    for(const action of ["poll","ack","status"]){for(const drift of drifts){const f=await setup(),id=randomUUID();
      if(action==="ack"){const r=ok(await f.coordinator.send("poll",f.proof(id)));r.data.key.fill(0);}
      const before=f.calls();f.hooks.afterCommit=()=>drift(f);const r=await f.coordinator.send(action,action==="ack"?f.ack(id):f.proof(id));
      denied(r);assert.equal(r.error,"delivery_unknown");assert.equal(f.calls(),before+1);assert.ok(f.responses.every(b=>b.every(v=>v===0)));
      if(action!=="status"){denied(await f.coordinator.send("poll",f.proof(id)));assert.equal(f.calls(),before+1);}
    }}assert.ok(secretBuffers.every(b=>b.every(v=>v===0)));
  });
  await t.test("overlap permits exact old/next; time cutover rejects old without a head revision change",async()=>{
    for(const next of [false,true]){const f=await setup();ok(await f.service.command(f.auth(),f.command(f.intent("stage"))));f.advance(1001);f.hooks.next=next;
      ok(await f.coordinator.send("status",f.proof()));}
    const old=await setup();ok(await old.service.command(old.auth(),old.command(old.intent("stage"))));old.advance(1001);
    old.hooks.afterCommit=async()=>{old.advance(9000);};assert.equal((await old.coordinator.send("status",old.proof())).error,"delivery_unknown");
    const next=await setup();ok(await next.service.command(next.auth(),next.command(next.intent("stage"))));next.advance(1001);next.hooks.next=true;
    next.hooks.afterCommit=async()=>{next.advance(9000);};ok(await next.coordinator.send("status",next.proof()));
    const drift=await setup();ok(await drift.service.command(drift.auth(),drift.command(drift.intent("stage"))));drift.advance(10001);
    drift.hooks.inspect=async()=>{ok(await drift.service.command(drift.auth(),drift.command(drift.intent("cutover"))));};
    denied(await drift.coordinator.send("status",drift.proof()));assert.equal(drift.calls(),0);
    const post=await setup();ok(await post.service.command(post.auth(),post.command(post.intent("stage"))));post.advance(10001);
    post.hooks.afterCommit=async()=>{ok(await post.service.command(post.auth(),post.command(post.intent("cutover"))));};
    assert.equal((await post.coordinator.send("status",post.proof())).error,"delivery_unknown");
    const bound=await setup(),id=randomUUID();ok(await bound.coordinator.send("request",bound.request(id)));
    ok(await bound.service.command(bound.auth(),bound.command(bound.intent("stage"))));bound.advance(1001);bound.hooks.next=true;
    const commits=bound.commits();denied(await bound.coordinator.send("status",bound.proof(id)));assert.equal(bound.commits(),commits);
  });
  await t.test("peer/address/pin/epoch/proxy/HTTP/replayed operation or copied snapshot cannot satisfy gates",async()=>{
    for(const patch of [{peerAddress:"1.1.1.1"},{addresses:["127.0.0.1"],peerAddress:"127.0.0.1"},{pin:pin("0")},{certificateEpoch:9},{proxy:true},{origin:"http://worker.example.com:443"},{chainValid:false}]){
      const f=await setup();f.hooks.peer=patch;denied(await f.coordinator.send("status",f.proof()));assert.equal(f.commits(),0);
    }
    for(const patch of [{peerAddress:"1.1.1.1",addresses:["1.1.1.1"]},{pin:pin("0")},{responseDigest:pin("0")},{commitUncertain:true}]){
      const f=await setup();f.hooks.complete=patch;assert.equal((await f.coordinator.send("status",f.proof())).error,"delivery_unknown");
    }
    const f=await setup(),other=await setup();f.dependencies.current=other.current;denied(await f.coordinator.send("status",f.proof()));assert.equal(f.calls(),0);
    const stale=await setup(),saved=await stale.current();ok(await stale.service.command(stale.auth(),stale.command(stale.intent("stage"))));stale.dependencies.current=async()=>saved;
    denied(await stale.coordinator.send("status",stale.proof()));assert.equal(stale.calls(),0);
    const replay=await setup();ok(await replay.coordinator.send("status",replay.proof()));replay.hooks.complete={operation:replay.operations[0]};
    assert.equal((await replay.coordinator.send("status",replay.proof())).error,"delivery_unknown");
    const gate=await setup();gate.hooks.beforePeer=async()=>{ok(await gate.service.command(gate.auth(),gate.command(gate.intent("revoke"))));};
    denied(await gate.coordinator.send("poll",gate.proof()));assert.equal(gate.commits(),0);
  });
  await t.test("missing adapters/verifier and bypassed or duplicate completion never release a credential",async()=>{
    const f=await setup();for(const deps of [undefined,{...f.dependencies,admission:undefined},{...f.dependencies,https:undefined},
      {...f.dependencies,admission:{inspect:f.dependencies.admission.inspect}}, {...f.dependencies,admission:{...f.dependencies.admission,completeVerified:"not-a-verifier"}}, {...f.dependencies,current:undefined}])
      denied(await createWorkerHandoffCoordinator(deps as any).send("status",f.proof()));assert.equal(f.calls(),0);
    const missing=createWorkerHandoffCoordinator({...f.dependencies,https:createWorkerHandoffHttpsClient()});denied(await missing.send("status",f.proof()));
    const buffer=Buffer.from(secret),bypass=createWorkerHandoffCoordinator({...f.dependencies,https:{sendAdmitted:async()=>({ok:true,data:{key:buffer},transportQualified:false,launchAuthority:false})}});
    assert.equal((await bypass.send("poll",f.proof())).error,"delivery_unknown");assert.ok(buffer.every(v=>v===0));
    const g=await setup(),original=g.dependencies.admission.completeVerified;
    g.dependencies.https={sendAdmitted:async(snapshot:any,op:any,body:any,gate:any)=>{
      const client=createWorkerHandoffHttpsClient(undefined,{...g.driver,exchange:async input=>{
        const reply=await g.driver.exchange(input),digest=createHash("sha256").update(reply.body).digest("hex");
        assert.equal(await gate.complete(reply.peer,digest),true);assert.equal(await gate.complete(reply.peer,digest),false);return reply;
      }});return client.sendAdmitted(snapshot,op,body,gate);
    }} as any;
    assert.equal((await g.coordinator.send("poll",g.proof())).error,"delivery_unknown");
    assert.equal(g.dependencies.admission.completeVerified,original);
  });
  await t.test("twenty concurrent same-request operations have one outcome; status remains persistence-read-only",async()=>{
    const f=await setup(),id=randomUUID(),before=f.ledger(),authority=copy({context:f.context,decisions:[...f.decisions]});
    const results=await Promise.all(Array.from({length:20},()=>f.coordinator.send("status",f.proof(id))));
    assert.equal(results.filter(r=>r.ok).length,1);assert.equal(f.calls(),1);assert.ok(results.filter(r=>!r.ok).every(r=>r.error==="replay_denied"));
    for(let n=0;n<5;n++)ok(await f.coordinator.send("status",f.proof(id)));assert.deepEqual(f.ledger(),before);assert.deepEqual(copy({context:f.context,decisions:[...f.decisions]}),authority);
    const pollId=randomUUID(),polls=await Promise.all(Array.from({length:20},()=>f.coordinator.send("poll",f.proof(pollId))));assert.equal(polls.filter(r=>r.ok).length,1);
    polls.find(r=>r.ok)!.data.key.fill(0);const calls=f.calls();denied(await f.coordinator.send("poll",f.proof(pollId)));assert.equal(f.calls(),calls);
  });
  await t.test("timeout, redirect, malformed/oversize/HTTP responses become terminal unknown with wiped proofs",async()=>{
    for(const setupHook of [(f:any)=>f.hooks.timeout=true,(f:any)=>f.hooks.response={statusCode:302},(f:any)=>f.hooks.response={statusCode:500},
      (f:any)=>f.hooks.raw=Buffer.from("not-json"),(f:any)=>f.hooks.raw=Buffer.alloc(9000),(f:any)=>f.hooks.skipPeer=true,
      (f:any)=>f.hooks.response={headers:{"content-type":"text/plain","content-length":"2"}}]){
      const f=await setup();setupHook(f);const proof=f.proof(),r=await f.coordinator.send("poll",proof);denied(r);assert.equal(r.error,"delivery_unknown");
      assert.ok(proof.deviceSecret.every(v=>v===0)&&proof.challenge.every(v=>v===0));assert.ok(f.responses.every(b=>b.every(v=>v===0)));
      const count=f.calls();denied(await f.coordinator.send("poll",f.proof(proof.requestId)));assert.equal(f.calls(),count);
    }
    const recovery=await setup(),id=randomUUID();recovery.hooks.timeout=true;denied(await recovery.coordinator.send("poll",recovery.proof(id)));
    recovery.hooks.timeout=false;denied(await recovery.coordinator.send("poll",recovery.proof(id)));ok(await recovery.coordinator.send("request",recovery.request()));
    assert.equal(effects,0);assert.ok(secretBuffers.every(b=>b.every(v=>v===0)));assert.equal(logs.length,0);
  });
  await t.test("deadline fences late peer approval and late completion without sending or releasing secrets",async child=>{
    let expire:()=>void=()=>{};
    child.mock.method(globalThis,"setTimeout",((callback:()=>void,ms:number)=>{assert.equal(ms,10000);expire=callback;return {} as any;}) as any);
    child.mock.method(globalThis,"clearTimeout",(()=>{}) as any);
    for(const phase of ["before_send","complete"]){
      const f=await setup(),original=f.dependencies.admission.completeVerified;
      let entered!:()=>void,release!:()=>void;
      const waiting=new Promise<void>(r=>entered=r),hold=new Promise<void>(r=>release=r);
      f.dependencies.admission.completeVerified=async(...args)=>{if(args[3]===phase){entered();await hold;}return original(...args);};
      const pending=f.coordinator.send("poll",f.proof());await waiting;expire();
      assert.equal((await pending).error,"delivery_unknown");release();await new Promise<void>(r=>setImmediate(r));
      assert.equal(f.commits(),phase==="before_send"?0:1);assert.ok(f.responses.concat(f.payloads).every(b=>b.every(v=>v===0)));
    }
    assert.ok(secretBuffers.every(b=>b.every(v=>v===0)));assert.equal(effects,0);
  });
});
