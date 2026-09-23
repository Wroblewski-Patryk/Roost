import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, randomUUID, sign } from "node:crypto";
import net from "node:net";
import tls from "node:tls";
import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import childProcess from "node:child_process";
import { reviewDigest } from "../modules/agent-runtime/task-review-contract";
import { decisionProposal } from "../modules/decisions/decision-governance-contract";
import { decisionAuthority } from "../modules/decisions/decision-authority";
import { createWorkerTransportService, transportPublicKeyDigest, transportSignedBytes,
  type SignedTransport, type TransportRecord, type TransportDecision, type TransportContext, type WorkerTransportStore } from "../modules/api-keys/worker-transport.service";
import { productionPeerAddress, productionTransportOrigin, workerTransportIntent, type TransportIntent } from "../modules/api-keys/worker-transport-contract";

const clone=<T>(v:T):T=>structuredClone(v), pin=(n:string)=>n.repeat(64);
function fixture(){
  const keys=generateKeyPairSync("ed25519"),publicKey=keys.publicKey.export({type:"spki",format:"pem"}).toString();
  let now=Date.parse("2026-09-23T12:00:00.000Z"),fault="";
  const iso=(delta=0)=>new Date(now+delta).toISOString();
  const identity={workspaceId:randomUUID(),installationId:randomUUID(),hostId:randomUUID(),hostFingerprint:pin("a"),credentialId:randomUUID(),credentialVersion:1,credentialEpoch:1,
    credentialFingerprint:pin("b"),ticketKeyId:"synthetic-ticket-issuer",ticketKeyEpoch:1,ticketPublicKeyDigest:transportPublicKeyDigest(publicKey)};
  const context:TransportContext={identity,ownerId:randomUUID(),ownerActive:true,hostActive:true,credentialActive:true,publicKey};
  let ledger={history:[] as SignedTransport<TransportRecord>[],audits:[] as unknown[]};
  const decisions=new Map<string,SignedTransport<TransportDecision>>();
  const seal=<T>(kind:"record"|"decision"|"observation",payload:T):SignedTransport<T>=>({payload:clone(payload),signature:sign(null,transportSignedBytes(kind,payload),keys.privateKey).toString("hex")});
  let tail=Promise.resolve();
  const store:WorkerTransportStore={transaction:async work=>{const before=tail;let unlock!:()=>void;tail=new Promise<void>(r=>unlock=r);await before;
    const draft=clone(ledger);
    try{const result=await work({context:async(w,h)=>w===identity.workspaceId&&h===identity.hostId?clone(context):null,
      head:async()=>clone(draft.history.at(-1)??null),decision:async id=>clone(decisions.get(id)??null),
      used:async(request,decision)=>draft.history.some(r=>r.payload.requestId===request||r.payload.decisionId===decision),
      pinUsed:async(_w,_h,value)=>draft.history.some(r=>r.payload.profile.certificate.fingerprint===value||r.payload.staged?.certificate.fingerprint===value),
      append:async record=>{draft.history.push(clone(record));if(fault==="append")throw Error("synthetic rollback");},
      audit:async record=>{draft.audits.push({revision:record.revision,state:record.state,digest:reviewDigest(record)});if(fault==="audit")throw Error("synthetic rollback");}
    });if(fault==="commit")throw Error("synthetic rollback");ledger=draft;return result;}finally{unlock();}
  }};
  const signer={keyId:identity.ticketKeyId,epoch:1,publicKey,sign:async(bytes:Buffer)=>sign(null,bytes,keys.privateKey)};
  const service=createWorkerTransportService(store,signer,()=>new Date(now));
  const auth=()=>({authType:"user" as const,workspaceRole:"owner" as const,workspaceId:identity.workspaceId,userId:context.ownerId,authenticatedAt:Math.floor(now/1000)});
  function intent(action:TransportIntent["action"]="create"):TransportIntent{
    const old=ledger.history.at(-1)?.payload;
    const certificate={fingerprint:pin("c"),hostname:"worker.example.com",notBefore:iso(-3600000),notAfter:iso(86400000)};
    const profile={origin:"https://worker.example.com:443",serverName:"worker.example.com",certificate,trust:{mode:"owner_approved_ca_digest" as const,caDigest:pin("d")},
      resolver:{policy:"public_ipv4_only_v1" as const,evidenceType:"issuer_signed_peer_observation_v1" as const},proxy:false as const,redirect:false as const,downgrade:false as const,
      bootstrap:{source:"owner_out_of_band" as const,evidenceDigest:pin("e"),fingerprint:certificate.fingerprint}};
    const i:TransportIntent={schemaVersion:"worker-transport-admission-v1",action,identity:clone(old?.identity??identity),expectedRevision:old?.revision??0,
      expectedDigest:old?reviewDigest(ledger.history.at(-1)):null,certificateEpoch:old?.certificateEpoch??1,profile:clone(old?.profile??profile),staged:clone(old?.staged??null),expiresAt:old?.expiresAt??iso(7200000),validUntil:iso(600000)};
    if(action==="stage")i.staged={epoch:i.certificateEpoch+1,certificate:{...i.profile.certificate,fingerprint:pin("f")},
      bootstrap:{source:"owner_out_of_band",evidenceDigest:pin("0"),fingerprint:pin("f")},overlapStartsAt:iso(1000),cutoverAt:iso(10000),expiresAt:iso(60000)};
    if(action==="cutover"&&old?.staged){i.certificateEpoch=old.staged.epoch;i.profile.certificate=clone(old.staged.certificate);i.profile.bootstrap=clone(old.staged.bootstrap);i.staged=null;}
    return i;
  }
  const command=(i=intent())=>{const id=randomUUID();decisions.set(id,seal("decision",{id,revision:1,ownerId:context.ownerId,state:"accepted",intentDigest:reviewDigest(i),acceptedAt:iso(),expiresAt:iso(7200000)}));
    return {requestId:randomUUID(),decisionId:id,decisionRevision:1,explicitAcceptance:true,intent:i};};
  const observation=(r:TransportRecord,patch:any={})=>seal("observation",{identity:r.identity,origin:r.profile.origin,serverName:r.profile.serverName,pin:r.profile.certificate.fingerprint,
    caDigest:r.profile.trust.caDigest,certificateNotBefore:r.profile.certificate.notBefore,certificateNotAfter:r.profile.certificate.notAfter,
    addresses:["8.8.8.8"],peerAddress:"8.8.8.8",observedAt:iso(),expiresAt:iso(30000),resolverPolicy:"public_ipv4_only_v1",source:"issuer_signed_peer_observation_v1",
    chainValid:true,hostnameValid:true,proxy:false,redirect:false,downgrade:false,...patch});
  const create=()=>service.command(auth(),command());
  return {service,store,signer,auth,context,identity,intent,command,decisions,seal,observation,create,iso,advance:(ms:number)=>now+=ms,
    ledger:()=>clone(ledger),fault:(value:string)=>fault=value};
}

test("production transport admission is source-only signed authority and state qualification",async t=>{
  let effects=0;const forbid=()=>{effects++;throw Error("external effect forbidden");};
  for(const method of ["connect","createConnection"] as const)t.mock.method(net,method,forbid);
  t.mock.method(net.Server.prototype,"listen",forbid);t.mock.method(tls,"connect",forbid);
  for(const module of [http,https])for(const method of ["request","get"] as const)t.mock.method(module,method,forbid);
  for(const method of ["lookup","resolve","resolve4","resolve6"] as const)t.mock.method(dns,method,forbid);
  for(const method of ["lookup","resolve","resolve4","resolve6"] as const)t.mock.method(dns.promises,method,forbid);
  t.mock.method(globalThis,"fetch",forbid);
  for(const method of ["spawn","spawnSync","exec","execSync","execFile","execFileSync","fork"] as const)t.mock.method(childProcess,method,forbid);
  const ok=(r:any)=>{assert.equal(r.ok,true,r.error);for(const flag of ["transportQualified","implementationReady","executionSupported","pilotReady","liveAdmissionAllowed","pilotExecutionAuthorized","pilotExecutionStarted"])assert.equal(r[flag],false);return r;};
  const denied=(r:any)=>{assert.equal(r.ok,false);assert.equal(r.transportQualified,false);};
  await t.test("valid create, exact signed observation, stage overlap, cutover and revoke",async()=>{
    const f=fixture(),created=ok(await f.create());
    const inspect=ok(await f.service.inspect(created.record,created.anchor,f.observation(created.record.payload)));ok(await f.service.complete(inspect.receipt));
    const staged=ok(await f.service.command(f.auth(),f.command(f.intent("stage"))));
    const next={pin:pin("f")};denied(await f.service.inspect(staged.record,staged.anchor,f.observation(staged.record.payload,next)));
    f.advance(1001);ok(await f.service.inspect(staged.record,staged.anchor,f.observation(staged.record.payload,next)));
    ok(await f.service.inspect(staged.record,staged.anchor,f.observation(staged.record.payload)));
    f.advance(9000);denied(await f.service.inspect(staged.record,staged.anchor,f.observation(staged.record.payload)));
    ok(await f.service.inspect(staged.record,staged.anchor,f.observation(staged.record.payload,next)));
    const cut=ok(await f.service.command(f.auth(),f.command(f.intent("cutover"))));
    denied(await f.service.inspect(cut.record,cut.anchor,f.observation(cut.record.payload,{pin:pin("c")})));
    const flight=ok(await f.service.inspect(cut.record,cut.anchor,f.observation(cut.record.payload)));
    const revoked=ok(await f.service.command(f.auth(),f.command(f.intent("revoke"))));assert.equal(revoked.record.payload.state,"revoked");
    denied(await f.service.inspect(revoked.record,revoked.anchor,f.observation(revoked.record.payload)));
    assert.equal((await f.service.complete(flight.receipt)).error,"delivery_unknown");
    assert.equal(f.ledger().history.length,4);
  });
  await t.test("fresh current primary owner and exact current signed decision are mandatory",async()=>{
    const f=fixture(),cmd=f.command();
    for(const patch of [{userId:randomUUID()},{workspaceRole:"admin"},{authType:"api_key",apiKeyId:randomUUID()},{agentId:randomUUID()},
      {workerTicketIdentity:{}},{authenticatedAt:0},{authenticatedAt:Math.floor(Date.parse(f.iso())/1000)+100},{workspaceId:randomUUID()}]){
      const auth={...f.auth(),...patch};if("workerTicketIdentity"in patch){auth.authType="api_key" as any;(auth as any).apiKeyId=randomUUID();}
      denied(await f.service.command(auth as any,cmd));assert.equal(f.ledger().history.length,0);
    }
    for(const patch of [{state:"revoked"},{revision:2},{ownerId:randomUUID()},{acceptedAt:f.iso(1)},{expiresAt:f.iso(-1)},{intentDigest:pin("0")},{expiresAt:"invalid"}]){
      const d=clone(f.decisions.get(cmd.decisionId)!);f.decisions.set(cmd.decisionId,f.seal("decision",{...d.payload,...patch} as any));
      denied(await f.service.command(f.auth(),cmd));f.decisions.set(cmd.decisionId,d);
    }
    const d=f.decisions.get(cmd.decisionId)!;d.signature="0".repeat(128);denied(await f.service.command(f.auth(),cmd));
    assert.equal(f.ledger().history.length,0);
  });
  await t.test("origin/hostname/certificate/bootstrap schema and metadata fail closed",async()=>{
    for(const origin of ["http://worker.example.com:443","https://worker.example.com","https://worker.example.com:0443","https://WORKER.example.com:443",
      "https://worker.example.com:443/","https://u:p@worker.example.com:443","https://worker.example.com:443?q=1","https://worker.example.com:443#x",
      "https://127.0.0.1:443","https://10.0.0.1:443","https://[::1]:443","https://localhost:443","https://service.local:443"])
      assert.equal(productionTransportOrigin.safeParse(origin).success,false,origin);
    for(const mutate of [(i:any)=>i.profile.serverName="other.example.com",(i:any)=>i.profile.certificate.hostname="other.example.com",
      (i:any)=>i.profile.certificate.notAfter="2020-01-01T00:00:00.000Z",(i:any)=>i.profile.certificate.notBefore="2030-01-01T00:00:00.000Z",
      (i:any)=>i.profile.bootstrap.fingerprint=pin("f"),(i:any)=>i.profile.bootstrap.source="endpoint_self_assertion",(i:any)=>i.profile.trust.mode="trust_endpoint",
      (i:any)=>i.profile.proxy=true,(i:any)=>i.profile.redirect=true,(i:any)=>i.profile.downgrade=true,(i:any)=>i.privateKey="never-accepted"]){
      const f=fixture(),i=f.intent();mutate(i);denied(await f.service.command(f.auth(),f.command(i)));assert.equal(f.ledger().history.length,0);
    }
  });
  await t.test("signed DNS evidence, rebinding and TLS flags cannot expand the origin",async()=>{
    const f=fixture(),r=ok(await f.create());
    for(const ip of ["0.0.0.0","10.1.2.3","100.64.1.2","127.0.0.1","169.254.169.254","172.16.1.2","192.168.1.1","192.0.2.1","198.18.1.1","198.51.100.1","203.0.113.1","224.0.0.1","255.255.255.255","::1","fe80::1","fc00::1","::ffff:8.8.8.8","2001:4860:4860::8888"]){
      assert.equal(productionPeerAddress(ip),false);denied(await f.service.inspect(r.record,r.anchor,f.observation(r.record.payload,{addresses:["8.8.8.8",ip],peerAddress:ip})));
    }
    for(const patch of [{origin:"https://worker.example.com:444"},{serverName:"other.example.com"},{caDigest:pin("0")},{pin:pin("0")},{chainValid:false},{hostnameValid:false},
      {proxy:true},{redirect:true},{downgrade:true},{source:"endpoint_self_assertion"},{peerAddress:"1.1.1.1"},{observedAt:f.iso(1)},{expiresAt:f.iso(-1)},{expiresAt:f.iso(30001)},
      {certificateNotAfter:f.iso(1)},{resolverPolicy:"arbitrary_override"}])denied(await f.service.inspect(r.record,r.anchor,f.observation(r.record.payload,patch)));
    const unsigned=f.observation(r.record.payload);unsigned.signature="0".repeat(128);denied(await f.service.inspect(r.record,r.anchor,unsigned));
    ok(await f.service.inspect(r.record,r.anchor,f.observation(r.record.payload,{addresses:["1.1.1.1"],peerAddress:"1.1.1.1"})));
  });
  await t.test("epoch rollback, skipped epoch, old record/decision and local state substitution deny",async()=>{
    const f=fixture(),cmd=f.command(),r=ok(await f.service.command(f.auth(),cmd));denied(await f.service.command(f.auth(),cmd));
    denied(await f.service.command(f.auth(),{...cmd,requestId:randomUUID()}));
    for(const epoch of [0,2,3]){const i=f.intent("stage");i.certificateEpoch=epoch;denied(await f.service.command(f.auth(),f.command(i)));}
    const mutation=f.intent("stage");mutation.profile.certificate.fingerprint=pin("1");mutation.profile.bootstrap.fingerprint=pin("1");denied(await f.service.command(f.auth(),f.command(mutation)));
    const staged=ok(await f.service.command(f.auth(),f.command(f.intent("stage"))));
    denied(await f.service.inspect(r.record,r.anchor,f.observation(r.record.payload)));
    for(const anchor of [null,{...staged.anchor,revision:1},{...staged.anchor,certificateEpoch:99},{...staged.anchor,highWaterEpoch:1},{...staged.anchor,recordDigest:pin("0")},
      {...staged.anchor,identity:{...staged.anchor.identity,installationId:randomUUID()}}])denied(await f.service.inspect(staged.record,anchor,f.observation(staged.record.payload)));
    const copy=fixture();denied(await copy.service.inspect(staged.record,staged.anchor,f.observation(staged.record.payload)));
    const forged=clone(staged.record);forged.payload.revision++;denied(await f.service.inspect(forged,staged.anchor,f.observation(staged.record.payload)));
    const d=f.decisions.get(staged.record.payload.decisionId)!;f.decisions.set(d.payload.id,f.seal("decision",{...d.payload,intentDigest:pin("1")}));
    denied(await f.service.inspect(staged.record,staged.anchor,f.observation(staged.record.payload)));
  });
  await t.test("bounded stage/cutover policy, missing next and deterministic concurrent transitions",async()=>{
    for(const mutate of [(i:any)=>i.staged=null,(i:any)=>i.staged.epoch=4,(i:any)=>i.staged.certificate.fingerprint=pin("c"),
      (i:any)=>i.staged.overlapStartsAt="2026-09-23T11:59:59.000Z",(i:any)=>i.staged.cutoverAt="2026-09-23T14:00:00.000Z",
      (i:any)=>i.staged.expiresAt="2026-09-23T12:00:05.000Z",(i:any)=>i.staged.bootstrap.fingerprint=pin("1")]){
      const f=fixture();ok(await f.create());const i=f.intent("stage");mutate(i);denied(await f.service.command(f.auth(),f.command(i)));assert.equal(f.ledger().history.length,1);
    }
    const f=fixture();ok(await f.create());const stage=f.command(f.intent("stage")),revoke=f.command(f.intent("revoke"));
    const raced=await Promise.all([f.service.command(f.auth(),stage),f.service.command(f.auth(),revoke)]);assert.equal(raced.filter(r=>r.ok).length,1);assert.equal(f.ledger().history.length,2);
    denied(await f.service.command(f.auth(),f.command(f.intent("cutover"))));
    f.advance(10001);const commands=[f.command(f.intent("stage")),f.command(f.intent("cutover")),f.command(f.intent("revoke"))];
    const results=await Promise.all(commands.map(c=>f.service.command(f.auth(),c)));assert.equal(results.filter(r=>r.ok).length,1);assert.equal(f.ledger().history.length,3);
    const late=fixture();ok(await late.create());const s=ok(await late.service.command(late.auth(),late.command(late.intent("stage"))));late.advance(60001);
    denied(await late.service.command(late.auth(),late.command(late.intent("cutover"))));denied(await late.service.inspect(s.record,s.anchor,late.observation(s.record.payload,{pin:pin("f")})));
  });
  await t.test("credential/installation/host/key drift blocks use and permits only explicit terminal revocation",async()=>{
    for(const patch of [{ownerId:randomUUID()},{ownerActive:false},{hostActive:false},{credentialActive:false}]){
      const f=fixture(),r=ok(await f.create());Object.assign(f.context,patch);denied(await f.service.inspect(r.record,r.anchor,f.observation(r.record.payload)));
    }
    for(const patch of [{credentialId:randomUUID()},{credentialVersion:2},{credentialEpoch:2},{credentialFingerprint:pin("f")},{installationId:randomUUID()},
      {hostFingerprint:pin("f")},{ticketKeyEpoch:2},{ticketKeyId:"other"},{ticketPublicKeyDigest:pin("f")}]){
      const f=fixture(),r=ok(await f.create());Object.assign(f.context.identity,patch);denied(await f.service.inspect(r.record,r.anchor,f.observation(r.record.payload)));
    }
    const f=fixture(),r=ok(await f.create());f.context.credentialActive=false;
    denied(await f.service.inspect(r.record,r.anchor,f.observation(r.record.payload)));ok(await f.service.command(f.auth(),f.command(f.intent("revoke"))));
    f.context.credentialActive=true;f.context.identity.credentialEpoch=2;f.context.identity.credentialVersion=2;
    const renewed=f.intent("create");renewed.identity=clone(f.context.identity);renewed.certificateEpoch=2;renewed.profile.certificate.fingerprint=pin("2");renewed.profile.bootstrap.fingerprint=pin("2");
    ok(await f.service.command(f.auth(),f.command(renewed)));assert.equal(f.ledger().history.at(-1)!.payload.certificateEpoch,2);
  });
  await t.test("ledger rollback, default closure and real decision schema keep all effects disabled",async()=>{
    const wrongKey=generateKeyPairSync("ec",{namedCurve:"prime256v1"});
    assert.throws(()=>transportPublicKeyDigest(wrongKey.publicKey.export({type:"spki",format:"pem"}).toString()));
    for(const stage of ["append","audit","commit"]){const f=fixture(),before=f.ledger();f.fault(stage);denied(await f.create());assert.deepEqual(f.ledger(),before);}
    const f=fixture();denied(await createWorkerTransportService().command(f.auth(),f.command()));
    denied(await createWorkerTransportService(f.store,undefined,()=>new Date(f.iso())).command(f.auth(),f.command()));
    assert.equal(workerTransportIntent.safeParse(f.intent()).success,true);
    const authority=await decisionAuthority({} as any,f.identity.workspaceId,{workerTransport:f.intent(),authority:{domain:"ordinary_domain"}},{},
      {ownerUserId:f.context.ownerId,ownerActive:true,mandates:[],workers:[],labels:[],truncated:false});assert.equal(authority.status,"owner_reserved");
    const base={requestId:randomUUID(),expectedVersion:pin("a"),title:"Synthetic transport",context:"Owner controlled",decision:"Admit exact transport",rationale:"Bound origin",consequences:"No activation",
      workerTransport:f.intent(),scopeReason:"Exact fixture",scope:[{type:"task",id:randomUUID()}],supersedesId:null,conflicts:[]};
    assert.equal(decisionProposal.safeParse(base).success,true);assert.equal(decisionProposal.safeParse({...base,workerCredential:{}}).success,false);
    assert.equal(effects,0);const launch=require("../../scripts/lib/agent-host-hermes-launch-contract.cjs");
    for(const flag of ["implementationReady","executionSupported","pilotReady","liveAdmissionAllowed","pilotExecutionAuthorized","pilotExecutionStarted"])assert.equal(launch[flag],false);
  });
});
