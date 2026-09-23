import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync,randomUUID,sign,createHash } from "node:crypto";
import net from "node:net";
import tls from "node:tls";
import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import childProcess from "node:child_process";
import { fixture as transportFixture } from "./worker-transport-fixture";
import { reviewDigest } from "../modules/agent-runtime/task-review-contract";
import { transportPublicKeyDigest,type SignedTransport } from "../modules/api-keys/worker-transport.service";
import { workerBootstrapIntent,type BootstrapTicket,type BootstrapDecision,type BootstrapIntent } from "../modules/api-keys/worker-bootstrap-contract";
import { createWorkerBootstrapService,bootstrapSignedBytes,bootstrapProofDigest,type BootstrapStore,type BootstrapTx,type BootstrapContext,
  type BootstrapAttempt,type BootstrapExchange } from "../modules/api-keys/worker-bootstrap.service";
import { decisionProposal } from "../modules/decisions/decision-governance-contract";
import { decisionAuthority } from "../modules/decisions/decision-authority";

const copy=<T>(v:T):T=>structuredClone(v),pin=(s:string)=>s.repeat(64),secret="synthetic-bootstrap-wire-only";
const ok=(r:any)=>{assert.equal(r.ok,true,r.error);for(const flag of ["transportQualified","implementationReady","executionSupported","pilotReady","liveAdmissionAllowed","pilotExecutionAuthorized","pilotExecutionStarted","launchAuthority"])assert.equal(r[flag],false);return r;};
const no=(r:any)=>{assert.equal(r.ok,false);assert.equal(r.liveAdmissionAllowed,false);return r;};
function setup(){
  const normal=transportFixture(),keys=generateKeyPairSync("ed25519"),publicKey=keys.publicKey.export({type:"spki",format:"pem"}).toString();
  let now=Date.parse(normal.iso()),calls=0,commits=0,reads=0,fault="";
  const iso=(delta=0)=>new Date(now+delta).toISOString(),proof=()=>Buffer.alloc(48,7);
  const binding={workspaceId:randomUUID(),installationId:randomUUID(),installationEpoch:1,hostId:randomUUID(),hostEpoch:1,hostFingerprint:pin("a"),
    ticketKeyId:"synthetic-bootstrap-issuer",ticketKeyEpoch:1,ticketPublicKeyDigest:transportPublicKeyDigest(publicKey)};
  const context:BootstrapContext={binding,ownerId:randomUUID(),ownerActive:true,hostActive:true,installationActive:true,publicKey,
    channel:{revision:1,certificateEpoch:1,highWaterEpoch:1,profile:normal.intent().profile,validUntil:iso(120000)},
    enrollmentGeneration:0,credentialHighWater:0,credential:null,credentialActive:false,credentialAcknowledged:false,prior:null};
  const seal=<T>(kind:"ticket"|"decision"|"peer"|"completion",payload:T):SignedTransport<T>=>({payload:copy(payload),signature:sign(null,bootstrapSignedBytes(kind,payload),keys.privateKey).toString("hex")});
  let ticket:BootstrapTicket,decision:BootstrapDecision;
  const tickets=new Map<string,{signed:SignedTransport<BootstrapTicket>;revoked:boolean}>(),decisions=new Map<string,SignedTransport<BootstrapDecision>>();
  function issue(purpose:BootstrapIntent["purpose"]="first_enrollment"){
    const i:BootstrapIntent={schemaVersion:"worker-bootstrap-admission-v1",purpose,binding:copy(context.binding),requestId:randomUUID(),deviceProofDigest:bootstrapProofDigest(proof()),
      channel:copy(context.channel),baseline:{enrollmentGeneration:context.enrollmentGeneration,credentialHighWater:context.credentialHighWater,credential:copy(context.credential)},
      target:{id:randomUUID(),version:1,epoch:context.credentialHighWater+1,fingerprint:pin(context.credentialHighWater?"f":"b")},prior:copy(context.prior),expiresAt:iso(60000)};
    decision={id:randomUUID(),revision:1,ownerId:context.ownerId,authority:"owner_reserved",state:"accepted",intentDigest:reviewDigest(i),acceptedAt:iso(),expiresAt:iso(60000)};
    ticket={version:"worker-bootstrap-owner-ticket-v1",id:randomUUID(),ownerId:context.ownerId,ownerAuthAt:iso(),issuedAt:iso(),decisionId:decision.id,
      decisionRevision:1,decisionIntentDigest:reviewDigest(i),intent:i};
    resign();return ticket;
  }
  function resign(){decision.intentDigest=reviewDigest(ticket.intent);ticket.decisionIntentDigest=decision.intentDigest;
    tickets.set(ticket.id,{signed:seal("ticket",ticket),revoked:false});decisions.set(decision.id,seal("decision",decision));}
  let ledger:BootstrapAttempt[]=[],tail=Promise.resolve();
  const hooks:{read?:()=>void;before?:()=>void;after?:()=>void;peer?:any;completion?:any;skip?:boolean;duplicate?:boolean;badPeerSignature?:boolean;badCompletionSignature?:boolean;wait?:Promise<void>}={};
  function txFor(rows:BootstrapAttempt[],c:BootstrapContext,writable:boolean):BootstrapTx{return {
    ticket:async id=>copy(tickets.get(id)??null),decision:async id=>copy(decisions.get(id)??null),context:async()=>copy(c),attempt:async id=>copy(rows.find(a=>a.ticketId===id)??null),
    reserve:async(a,t)=>{assert.ok(writable);if(rows.some(x=>x.ticketId===a.ticketId||x.decisionId===a.decisionId||x.requestId===a.requestId)||
      c.enrollmentGeneration!==t.intent.baseline.enrollmentGeneration||c.credentialHighWater!==t.intent.baseline.credentialHighWater)throw Error("synthetic uniqueness");
      rows.push(copy(a));c.enrollmentGeneration++;c.credentialHighWater=t.intent.target.epoch;if(fault==="reserve")throw Error("synthetic rollback");},
    transition:async(id,from,to)=>{assert.ok(writable);const a=rows.find(x=>x.id===id);if(!a||a.state!==from)return false;a.state=to;
      if(fault===to)throw Error("synthetic rollback");return true;}
  };}
  const store:BootstrapStore={qualification:"synthetic_bootstrap_ledger_v1",transaction:async work=>{
    const before=tail;let unlock!:()=>void;tail=new Promise<void>(r=>unlock=r);await before;const rows=copy(ledger),c=copy(context);
    try{const result=await work(txFor(rows,c,true));ledger=rows;Object.assign(context,c);return result;}finally{unlock();}},
    read:async work=>{reads++;hooks.read?.();await tail;return work(txFor(copy(ledger),copy(context),false));}};
  const wires:Buffer[]=[],proofs:Buffer[]=[];
  const exchange:BootstrapExchange={qualification:"synthetic_bootstrap_exchange_v1",run:async input=>{
    calls++;proofs.push(input.deviceProof);assert.ok(Object.isFrozen(input.permit.intent.channel.profile));await hooks.wait;hooks.before?.();
    const i=input.permit.intent,p=i.channel.profile,a=input.permit.attempt;
    const peer=seal("peer",{binding:i.binding,attemptId:a.id,ticketDigest:a.ticketDigest,certificateEpoch:i.channel.certificateEpoch,
      origin:p.origin,serverName:p.serverName,caDigest:p.trust.caDigest,pin:p.certificate.fingerprint,certificateNotBefore:p.certificate.notBefore,certificateNotAfter:p.certificate.notAfter,
      addresses:["8.8.8.8"],peerAddress:"8.8.8.8",observedAt:iso(),expiresAt:iso(30000),resolverPolicy:"public_ipv4_only_v1" as const,
      source:"issuer_signed_peer_observation_v1" as const,chainValid:true as const,hostnameValid:true as const,proxy:false as const,redirect:false as const,downgrade:false as const,...hooks.peer});
    if(hooks.badPeerSignature)peer.signature=pin("0").repeat(2);
    if(!hooks.skip&&!await input.beforeSend(peer))throw Error(secret);
    if(hooks.duplicate)assert.equal(await input.beforeSend(peer),false);
    commits++;context.credential=copy(i.target);context.credentialActive=true;context.credentialAcknowledged=true;
    const ownedWire=Buffer.from(secret);wires.push(ownedWire);
    const completion=seal("completion",{version:"worker-bootstrap-completion-v1" as const,attemptId:a.id,ticketDigest:a.ticketDigest,requestId:a.requestId,
      state:"acknowledged" as const,credential:i.target,peer:peer.payload,responseDigest:createHash("sha256").update(ownedWire).digest("hex"),committedAt:iso(),...hooks.completion});
    if(hooks.badCompletionSignature)completion.signature=pin("0").repeat(2);
    hooks.after?.();return {completion,ownedWire};
  }};
  issue();const service=createWorkerBootstrapService(store,exchange,()=>new Date(now));
  const input=()=>({ticketId:ticket.id,deviceProof:proof()});
  return {context,tickets,decisions,seal,issue,resign,service,store,exchange,input,hooks,wires,proofs,normal,iso,
    ticket:()=>ticket,decision:()=>decision,ledger:()=>copy(ledger),calls:()=>calls,commits:()=>commits,reads:()=>reads,fault:(v:string)=>fault=v,advance:(ms:number)=>now+=ms};
}

test("bootstrap is a bounded owner-only synthetic authority; external effects forbidden",async t=>{
  let effects=0;const forbid=()=>{effects++;throw Error("external effect forbidden");};
  for(const m of ["connect","createConnection"] as const)t.mock.method(net,m,forbid);
  t.mock.method(net.Server.prototype,"listen",forbid);t.mock.method(tls,"connect",forbid);
  for(const module of [http,https])for(const m of ["request","get"] as const)t.mock.method(module,m,forbid);
  for(const m of ["lookup","resolve","resolve4","resolve6"] as const){t.mock.method(dns,m,forbid);t.mock.method(dns.promises,m,forbid);}
  t.mock.method(globalThis,"fetch",forbid);
  for(const m of ["spawn","spawnSync","exec","execSync","execFile","execFileSync","fork"] as const)t.mock.method(childProcess,m,forbid);
  const logs:unknown[]=[];for(const m of ["log","warn","error"] as const)t.mock.method(console,m,(...args:unknown[])=>logs.push(args));

  await t.test("first enrollment needs no active credential and produces only public ACK metadata",async()=>{
    const f=setup(),input=f.input(),r=ok(await f.service.consume(input));assert.equal(r.normalAdmissionRequired,true);
    assert.equal(r.credential.id,f.ticket().intent.target.id);assert.equal(f.ledger()[0].state,"acknowledged");assert.equal(f.calls(),1);
    assert.equal(f.context.enrollmentGeneration,1);assert.equal(f.context.credentialHighWater,1);
    assert.ok(input.deviceProof.every(v=>v===0));assert.ok(f.wires.every(b=>b.every(v=>v===0)));assert.ok(!JSON.stringify(r).includes(secret));
  });
  await t.test("recovery requires a fresh owner decision and ticket and burns a new generation",async()=>{
    const f=setup();f.hooks.after=()=>{f.decision().state="revoked";f.resign();};no(await f.service.consume(f.input()));
    const old=f.input(),prior=f.ledger()[0];f.context.credentialActive=false;f.context.credentialAcknowledged=false;
    f.context.prior={attemptId:prior.id,state:"delivery_unknown",credential:copy(f.context.credential)};
    delete f.hooks.after;f.issue("owner_recovery");ok(await f.service.consume(f.input()));assert.equal(f.context.credentialHighWater,2);
    assert.equal(no(await f.service.consume(old)).error,"replay");assert.equal(f.ledger().length,2);
    const healthy=setup();ok(await healthy.service.consume(healthy.input()));healthy.context.prior={attemptId:healthy.ledger()[0].id,state:"revoked_credential",credential:healthy.context.credential};
    healthy.issue("owner_recovery");assert.equal(no(await healthy.service.consume(healthy.input())).error,"normal_admission_required");
    for(const revoked of ["hostActive","installationActive"] as const){const denied=setup();denied.hooks.before=()=>denied.context.ownerActive=false;
      no(await denied.service.consume(denied.input()));delete denied.hooks.before;denied.context.ownerActive=true;
      denied.context.prior={attemptId:denied.ledger()[0].id,state:"delivery_unknown",credential:null};denied.issue("owner_recovery");
      denied.context[revoked]=false;no(await denied.service.consume(denied.input()));assert.equal(denied.calls(),1);assert.equal(denied.context[revoked],false);}
    const empty=setup();empty.hooks.before=()=>empty.context.ownerActive=false;no(await empty.service.consume(empty.input()));delete empty.hooks.before;empty.context.ownerActive=true;
    empty.context.prior={attemptId:empty.ledger()[0].id,state:"delivery_unknown",credential:null};empty.issue("owner_recovery");ok(await empty.service.consume(empty.input()));
  });
  const drift:Array<(f:ReturnType<typeof setup>)=>void>=[f=>f.context.ownerActive=false,(f:ReturnType<typeof setup>)=>f.context.ownerId=randomUUID(),(f:ReturnType<typeof setup>)=>f.context.hostActive=false,(f:ReturnType<typeof setup>)=>f.context.installationActive=false,
    f=>f.context.binding.workspaceId=randomUUID(),(f:ReturnType<typeof setup>)=>f.context.binding.installationId=randomUUID(),(f:ReturnType<typeof setup>)=>f.context.binding.installationEpoch++,(f:ReturnType<typeof setup>)=>f.context.binding.hostId=randomUUID(),
    f=>f.context.binding.hostEpoch++,(f:ReturnType<typeof setup>)=>f.context.binding.hostFingerprint=pin("0"),(f:ReturnType<typeof setup>)=>f.context.binding.ticketKeyEpoch++,(f:ReturnType<typeof setup>)=>f.context.binding.ticketKeyId="replaced",
    f=>f.context.publicKey=f.normal.context.publicKey,(f:ReturnType<typeof setup>)=>f.context.channel.revision++,(f:ReturnType<typeof setup>)=>f.context.channel.certificateEpoch++,(f:ReturnType<typeof setup>)=>f.context.channel.highWaterEpoch++,
    f=>f.context.channel.profile.certificate.fingerprint=pin("0"),(f:ReturnType<typeof setup>)=>f.context.channel.profile.trust.caDigest=pin("0"),
    f=>{f.decision().state="revoked";f.resign();},(f:ReturnType<typeof setup>)=>{f.tickets.get(f.ticket().id)!.revoked=true;},(f:ReturnType<typeof setup>)=>f.advance(60000)];
  await t.test("wrong owner, workspace, installation, host, keys, decision or revoked ticket denies without exchange",async()=>{
    for(const change of drift){const f=setup();change(f);no(await f.service.consume(f.input()));assert.equal(f.calls(),0);assert.equal(f.ledger().length,0);}
    const f=setup();f.tickets.get(f.ticket().id)!.signed.signature=pin("0").repeat(2);no(await f.service.consume(f.input()));assert.equal(f.calls(),0);
  });
  await t.test("strict purpose, expiry, device proof and replay rules",async()=>{
    for(const edit of [(f:ReturnType<typeof setup>)=>f.ticket().ownerAuthAt=f.iso(-300001),(f:ReturnType<typeof setup>)=>f.ticket().intent.expiresAt=f.iso(120001),
      (f:ReturnType<typeof setup>)=>f.ticket().intent.baseline.enrollmentGeneration=1,(f:ReturnType<typeof setup>)=>f.ticket().intent.target.epoch=2,(f:ReturnType<typeof setup>)=>f.ticket().intent.purpose="owner_recovery"]){
      const f=setup();edit(f);f.resign();no(await f.service.consume(f.input()));assert.equal(f.calls(),0);}
    const f=setup(),wrong=f.input();wrong.deviceProof.fill(9);assert.equal(no(await f.service.consume(wrong)).error,"device_denied");assert.ok(wrong.deviceProof.every(v=>v===0));
    ok(await f.service.consume(f.input()));assert.equal(no(await f.service.consume(f.input())).error,"replay");assert.equal(f.calls(),1);
  });
  await t.test("20 concurrent consumers admit exactly one exchange",async()=>{
    const f=setup(),inputs=Array.from({length:20},()=>f.input()),results=await Promise.all(inputs.map(i=>f.service.consume(i)));
    assert.equal(results.filter(r=>r.ok).length,1);assert.equal(f.calls(),1);assert.equal(f.ledger().length,1);assert.ok(inputs.every(i=>i.deviceProof.every(v=>v===0)));
    const distinct=setup(),tickets=Array.from({length:20},()=>{distinct.issue();return distinct.input();});
    const outcomes=await Promise.all(tickets.map(i=>distinct.service.consume(i)));assert.equal(outcomes.filter(r=>r.ok).length,1);assert.equal(distinct.calls(),1);
  });
  await t.test("fresh pre-exchange drift blocks with zero exchange and never unburns the ticket",async()=>{
    for(const change of drift){const f=setup();f.hooks.read=()=>change(f);no(await f.service.consume(f.input()));assert.equal(f.calls(),0);assert.equal(f.ledger()[0].state,"blocked");assert.equal(f.context.enrollmentGeneration,1);
      delete f.hooks.read;assert.equal(no(await f.service.consume(f.input())).error,"replay");}
  });
  await t.test("pre-body revocation denies send; post-commit drift is terminal unknown",async()=>{
    for(const change of drift){const before=setup();before.hooks.before=()=>change(before);assert.equal(no(await before.service.consume(before.input())).error,"delivery_unknown");assert.equal(before.commits(),0);
      const after=setup();after.hooks.after=()=>change(after);assert.equal(no(await after.service.consume(after.input())).error,"delivery_unknown");assert.equal(after.commits(),1);
      assert.equal(after.ledger()[0].state,"delivery_unknown");assert.ok(after.wires.every(b=>b.every(v=>v===0)));no(await after.service.consume(after.input()));assert.equal(after.calls(),1);}
  });
  await t.test("peer mismatch and private/rebound addresses cannot authorize a body",async()=>{
    for(const patch of [{pin:pin("0")},{certificateEpoch:2},{caDigest:pin("0")},{attemptId:randomUUID()},{ticketDigest:pin("0")},
      {addresses:["127.0.0.1"],peerAddress:"127.0.0.1"},{addresses:["8.8.8.8","10.0.0.1"]},{peerAddress:"1.1.1.1"},{chainValid:false},{proxy:true}]){
      const f=setup();f.hooks.peer=patch;no(await f.service.consume(f.input()));assert.equal(f.commits(),0);}
  });
  await t.test("certificate cutover is a hard fence and requires a fresh owner-bound ticket",async()=>{
    const f=setup();f.context.channel.validUntil=f.iso(1000);f.ticket().intent.channel=copy(f.context.channel);f.resign();no(await f.service.consume(f.input()));assert.equal(f.calls(),0);
    f.ticket().intent.expiresAt=f.iso(1000);f.resign();f.hooks.after=()=>f.advance(1000);no(await f.service.consume(f.input()));assert.equal(f.ledger()[0].state,"delivery_unknown");
    const next=setup();next.context.channel.certificateEpoch=2;next.context.channel.highWaterEpoch=2;next.context.channel.revision++;
    next.context.channel.profile.certificate.fingerprint=pin("f");next.context.channel.profile.bootstrap.fingerprint=pin("f");next.issue();ok(await next.service.consume(next.input()));
  });
  await t.test("missing dependencies and caller URL/CA/pin/header/epoch overrides fail closed",async()=>{
    const f=setup();for(const service of [createWorkerBootstrapService(),createWorkerBootstrapService(f.store),createWorkerBootstrapService(undefined,f.exchange)]){
      const input=f.input();assert.equal(no(await service.consume(input)).error,"unavailable");assert.ok(input.deviceProof.every(v=>v===0));}
    for(const patch of [{url:"https://other.example.com:443"},{pin:pin("0")},{ca:secret},{headers:{authorization:secret}},{epoch:2},{action:"poll"}])no(await f.service.consume({...f.input(),...patch}));
    no(await f.service.consume(f.input(),{}));assert.equal(f.calls(),0);
  });
  await t.test("completion integrity, ACK candidate, missing or replayed verification are mandatory",async()=>{
    for(const patch of [{responseDigest:pin("0")},{requestId:randomUUID()},{attemptId:randomUUID()},{ticketDigest:pin("0")},{state:"pending"}]){
      const f=setup();f.hooks.completion=patch;no(await f.service.consume(f.input()));assert.equal(f.ledger()[0].state,"delivery_unknown");assert.ok(f.wires.every(b=>b.every(v=>v===0)));}
    for(const mode of ["skip","duplicate","badPeerSignature","badCompletionSignature"] as const){const f=setup();f.hooks[mode]=true;no(await f.service.consume(f.input()));}
    for(const change of [(f:ReturnType<typeof setup>)=>f.context.credentialAcknowledged=false,(f:ReturnType<typeof setup>)=>f.context.credential!.id=randomUUID(),(f:ReturnType<typeof setup>)=>f.context.credentialHighWater++]){
      const f=setup();f.hooks.after=()=>change(f);no(await f.service.consume(f.input()));}
  });
  await t.test("status is read-only before and after ACK and cannot renew authority",async()=>{
    const f=setup();for(const completed of [false,true]){if(completed)ok(await f.service.consume(f.input()));const before=JSON.stringify({ledger:f.ledger(),context:f.context}),calls=f.calls();
      for(let i=0;i<5;i++)ok(await f.service.status(f.input()));assert.equal(JSON.stringify({ledger:f.ledger(),context:f.context}),before);assert.equal(f.calls(),calls);}
    f.advance(60000);no(await f.service.status(f.input()));assert.equal(f.calls(),1);
  });
  await t.test("ledger reservation and transition failures rollback and never produce success",async()=>{
    const f=setup();f.fault("reserve");no(await f.service.consume(f.input()));assert.equal(f.context.enrollmentGeneration,0);assert.equal(f.ledger().length,0);assert.equal(f.calls(),0);
    const dispatch=setup();dispatch.fault("dispatched");no(await dispatch.service.consume(dispatch.input()));assert.equal(dispatch.commits(),0);assert.equal(dispatch.ledger()[0].state,"delivery_unknown");
    const ack=setup();ack.fault("acknowledged");no(await ack.service.consume(ack.input()));assert.equal(ack.ledger()[0].state,"delivery_unknown");
    const terminal=setup();terminal.hooks.skip=true;terminal.fault("delivery_unknown");assert.equal(no(await terminal.service.consume(terminal.input())).error,"reconciliation_required");
  });
  await t.test("deadline rejects late peer and wipes late response without retry",async child=>{
    let expire!:()=>void;child.mock.method(globalThis,"setTimeout",((callback:()=>void,ms:number)=>{assert.equal(ms,10000);expire=callback;return {} as any;}) as any);
    child.mock.method(globalThis,"clearTimeout",(()=>{}) as any);
    const f=setup();let resume!:()=>void;f.hooks.wait=new Promise<void>(r=>resume=r);const pending=f.service.consume(f.input());
    for(let i=0;i<50&&!expire;i++)await Promise.resolve();assert.ok(expire);expire();assert.equal(no(await pending).error,"delivery_unknown");
    resume();for(let i=0;i<20;i++)await Promise.resolve();assert.equal(f.commits(),0);
    const late=setup();let release!:(v:any)=>void;const exchange:BootstrapExchange={qualification:"synthetic_bootstrap_exchange_v1",run:()=>new Promise(r=>release=r)};
    const service=createWorkerBootstrapService(late.store,exchange,()=>new Date(late.iso())),out=service.consume(late.input());
    for(let i=0;i<50&&!release;i++)await Promise.resolve();assert.ok(release);expire();no(await out);
    const wire=Buffer.from(secret);release({ownedWire:wire});for(let i=0;i<20;i++)await Promise.resolve();assert.ok(wire.every(v=>v===0));
  });
  await t.test("owner-reserved governance stays separate and normal admission still requires an active credential",async()=>{
    const f=setup(),body={requestId:randomUUID(),expectedVersion:pin("a"),title:"Bootstrap",context:"Owner enrollment",decision:"Enroll exact host",rationale:"First credential",consequences:"New credential",
      workerBootstrap:f.ticket().intent,scopeReason:"Exact host",scope:[{type:"resource",id:randomUUID()}],supersedesId:null,conflicts:[]};
    assert.ok(decisionProposal.safeParse(body).success);assert.equal(decisionProposal.safeParse({...body,workerTransport:f.normal.intent()}).success,false);
    const authority=await decisionAuthority({} as any,f.context.binding.workspaceId,{...body,authority:{domain:"ordinary_domain"}}, {},
      {ownerUserId:f.context.ownerId,ownerActive:true,mandates:[],workers:[],labels:[],truncated:false});assert.equal(authority.status,"owner_reserved");assert.equal(authority.reason,"worker_bootstrap_admission");
    f.normal.context.credentialActive=false;assert.equal((await f.normal.create()).ok,false);assert.equal(f.normal.ledger().history.length,0);
    assert.equal(workerBootstrapIntent.safeParse({...f.ticket().intent,action:"poll"}).success,false);
  });
  assert.equal(effects,0);assert.deepEqual(logs,[]);
});
