import test from "node:test";
import assert from "node:assert/strict";
import https from "node:https";
import net from "node:net";
import type { AddressInfo } from "node:net";
import type { ServerResponse, IncomingMessage } from "node:http";
import childProcess from "node:child_process";
import { X509Certificate, createHash } from "node:crypto";
import path from "node:path";
import express from "express";
import { fixture, approve } from "./worker-handoff-fixture";
import { createWorkerHandoffHttpsClient, handoffHttpsPaths } from "../modules/api-keys/worker-handoff-https";
import { handoffAckProof, handoffPolicy } from "../modules/api-keys/worker-handoff-contract";
import { workerHandoffHandler } from "../modules/api-keys/worker-handoff-http";
import { hashApiKey } from "../auth/api-key";

test("explicit handoff HTTPS adapter: real loopback TLS only", {timeout:120000}, async t=>{
  // This one synchronous certificate-generation utility is the only child. Its
  // output never reaches test diagnostics or disk; no TLS/private key is committed.
  const encoded=childProcess.execFileSync(process.env.PYTHON??"python",[path.resolve(__dirname,"../../src/tests/worker-handoff-certs.py")],{windowsHide:true,timeout:20000,maxBuffer:131072});
  const generated=JSON.parse(encoded.toString());encoded.fill(0);
  const ca=generated.ca, certs:Record<string,{cert:string,key:Buffer,pin:string}>={};delete generated.ca;
  for(const [label, material] of Object.entries(generated) as any){certs[label]={cert:material.cert,key:Buffer.from(material.key),pin:createHash("sha256").update(new X509Certificate(material.cert).raw).digest("hex")};delete material.key;}
  for(const method of ["spawn","spawnSync","exec","execSync","execFile","execFileSync","fork"] as const)
    t.mock.method(childProcess,method,()=>{throw Error("target process forbidden in HTTPS qualification");});
  const logs:string[]=[];for(const method of ["log","warn","error"] as const)t.mock.method(console,method,(...args:unknown[])=>{logs.push(args.map(String).join(" "));});
  const sockets=new Set<net.Socket>(),servers=new Set<net.Server>(),clients:Array<ReturnType<typeof createWorkerHandoffHttpsClient>>=[];
  let handlers=0;const seenSni:string[]=[], responseErrors:any[]=[];
  const track=(server:net.Server)=>{servers.add(server);server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket));});};
  const listen=async(server:net.Server)=>{track(server);server.listen(0,"127.0.0.1");await new Promise<void>(r=>server.once("listening",r));return (server.address() as AddressInfo).port;};
  const close=async(server:net.Server)=>{for(const socket of sockets)socket.destroy();await new Promise<void>(r=>server.close(()=>r()));servers.delete(server);};
  t.after(async()=>{for(const client of clients)client.close();for(const socket of sockets)socket.destroy();for(const server of [...servers])await close(server);
    await new Promise(r=>setImmediate(r));assert.equal(sockets.size,0);assert.equal(servers.size,0);for(const cert of Object.values(certs))cert.key.fill(0);
    assert.ok(Object.values(certs).every(c=>c.key.every(v=>v===0)));});
  const config=(port:number,cert=certs.current,patch:any={})=>({qualifiedState:"loopback_https_v1",origin:`https://handoff.example.test:${port}`,loopbackAddress:"127.0.0.1",ca,
    pins:{epoch:1,current:cert.pin},timeouts:{connectMs:1000,readMs:1000,deadlineMs:3000},...patch});
  const client=(input?:unknown)=>{const c=createWorkerHandoffHttpsClient(input);clients.push(c);return c;};
  const f=fixture(),app=express();app.use(express.json({limit:"8kb"}));let lose=false;
  for(const action of ["request","poll","ack","status"] as const)app.post(handoffHttpsPaths[action],async(req,res)=>{
    handlers++;seenSni.push((req.socket as any).servername);
    if(action==="poll"&&lose){lose=false;const original=res.json.bind(res);res.json=((body:any)=>{body.data.key="";res.socket?.destroy();return res;}) as any;
      await workerHandoffHandler(action,f.service)(req,res);res.json=original;
    }else await workerHandoffHandler(action,f.service)(req,res);
  });
  const server=https.createServer(certs.current,app),port=await listen(server),origin=config(port).origin;
  f.transport({qualification:"synthetic_memory_only",requestedOrigin:origin,connectedOrigin:origin,certificateFingerprint:certs.current.pin,tlsValidated:true,redirected:false,proxyOrigin:null});
  const primary=client(config(port)), d=f.requestBase();
  const success=(r:any)=>{if(!r.ok)responseErrors.push(r);assert.equal(r.ok,true);return r.data;};
  const acknowledge=(request:any,data:any)=>{const hash=hashApiKey(data.key);data.key="";return {...f.proof(request),credentialId:data.credential.id,
    credentialFingerprint:data.credential.fingerprint,responseDigest:data.responseDigest,ackProof:handoffAckProof(hash,request.requestId,data.responseDigest)};};
  const safeFailure=(r:any,expected?:string)=>{assert.equal(r.ok,false);if(expected)assert.equal(r.error,expected);assert.equal(r.transportQualified,false);assert.equal(r.launchAuthority,false);responseErrors.push(r);};
  await t.test("request / separate owner approval / 20 polls / ACK / status over authenticated pinned TLS",async()=>{
    const created=success(await primary.send("request",f.wire(d)));d.userCode=created.userCode;await approve(f,d);
    const results=await Promise.all(Array.from({length:20},()=>primary.send("poll",f.proof(d))));results.forEach(success);
    const deliveries=results.filter(r=>r.ok&&r.data.key);assert.equal(deliveries.length,1);assert.equal(f.delivered.length,1);
    const delivered=success(deliveries[0]);assert.equal(f.model.keys[0].active,false);
    const raw=delivered.key;assert.ok(!JSON.stringify(f.model).includes(raw));assert.ok(!logs.join("\n").includes(raw));
    const ack=acknowledge(d,delivered);
    const acks=await Promise.all(Array.from({length:20},()=>primary.send("ack",{...ack,...f.proof(d)})));
    assert.equal(acks.filter(r=>r.ok).length,1);assert.ok(acks.filter(r=>!r.ok).every(r=>!r.ok&&r.error==="replay_denied"));
    assert.equal(success(acks.find(r=>r.ok)).state,"acknowledged");ack.deviceSecret.fill(0);ack.challenge.fill(0);
    const before=handlers;safeFailure(await primary.send("ack",{...ack,...f.proof(d)}),"replay_denied");assert.equal(handlers,before);
    assert.equal(success(await primary.send("status",f.proof(d))).state,"acknowledged");assert.equal(f.model.operations.length,1);
    assert.ok(seenSni.every(name=>name==="handoff.example.test"));assert.ok(f.buffers.every(b=>b.every(v=>v===0)));
  });
  await t.test("default/unknown configuration, canonical origin and operation surface are closed",async()=>{
    for(const invalid of [undefined,{}, {...config(port),qualifiedState:"production"},{...config(port),ca:undefined},{...config(port),timeouts:undefined},
      {...config(port),headers:{Authorization:"forbidden"}},{...config(port),loopbackAddress:"192.0.2.1"},
      {...config(port),servername:"other.example.test"},{...config(port),lookup:()=>"192.0.2.1"}])safeFailure(await client(invalid).send("status",f.proof(d)),"unavailable");
    for(const base of ["http://handoff.example.test",`https://user:password@handoff.example.test:${port}`,origin+"/",origin+"?q=1",origin+"#x",`https://HANDOFF.example.test:${port}`,"https://127.0.0.1:443"])
      safeFailure(await client({...config(port),origin:base}).send("status",f.proof(d)),"unavailable");
    for(const action of ["GET","POST","approve","/v1/worker-credential-handoff/poll","poll?x=1","constructor"])safeFailure(await primary.send(action,f.proof(d)),"request_invalid");
    safeFailure(await primary.send("status",f.proof(d),{headers:{Authorization:"not-allowed"}}),"request_invalid");
    safeFailure(await primary.send("status",{...f.proof(d),url:origin,headers:{"X-Device-Proof":"not-allowed"}}),"request_invalid");
    const other=f.requestBase();safeFailure(await primary.send("request",{...f.wire(other),origin:origin+"1"}),"request_invalid");f.wipe(other);
  });
  await t.test("wrong certificate, hostname, CA, SPKI, validity and pin deny before HTTP body",async()=>{
    for(const label of ["wrongHost","expired","future","untrusted","selfSigned"]){let calls=0;
      const s=https.createServer(certs[label],(_req,res)=>{calls++;res.end();});const p=await listen(s);
      safeFailure(await client(config(p,certs[label])).send("status",f.proof(d)),"tls_denied");assert.equal(calls,0);await close(s);
    }
    const before=handlers;
    for(const pin of ["0".repeat(64),createHash("sha256").update(new X509Certificate(certs.current.cert).publicKey.export({type:"spki",format:"der"})).digest("hex")])
      safeFailure(await client({...config(port),pins:{epoch:1,current:pin}}).send("status",f.proof(d)),"tls_denied");
    safeFailure(await client({...config(port),origin:`https://other.example.test:${port}`}).send("status",f.proof(d)),"tls_denied");
    safeFailure(await client({...config(port),ca:certs.untrusted.cert}).send("status",f.proof(d)),"tls_denied");assert.equal(handlers,before);
    const wrongPort=net.createServer();const p=await listen(wrongPort);await close(wrongPort);
    safeFailure(await client(config(p)).send("status",f.proof(d)),"tls_denied");
  });
  await t.test("explicit next pin overlap and cutover reject unknown and old certificate",async()=>{
    const staged={epoch:2,next:certs.next.pin,overlapStartsAt:new Date(Date.now()-1000).toISOString(),cutoverAt:new Date(Date.now()+60000).toISOString()};
    success(await client({...config(port),pins:{epoch:1,current:certs.current.pin,staged}}).send("status",f.proof(d)));
    server.setSecureContext(certs.next);
    const before=handlers;safeFailure(await primary.send("status",f.proof(d)),"tls_denied");assert.equal(handlers,before);
    success(await client({...config(port),pins:{epoch:1,current:certs.current.pin,staged}}).send("status",f.proof(d)));
    const cutover={...staged,overlapStartsAt:new Date(Date.now()-60000).toISOString(),cutoverAt:new Date(Date.now()-1000).toISOString()};
    success(await client({...config(port),pins:{epoch:1,current:certs.current.pin,staged:cutover}}).send("status",f.proof(d)));
    server.setSecureContext(certs.current);
    safeFailure(await client({...config(port),pins:{epoch:1,current:certs.current.pin,staged:cutover}}).send("status",f.proof(d)),"tls_denied");
    safeFailure(await client({...config(port),pins:{epoch:1,current:certs.current.pin,staged:{...staged,epoch:4}}}).send("status",f.proof(d)),"unavailable");
  });
  await t.test("proxy environment is ignored; same/cross-origin redirects never followed",async()=>{
    let proxyCalls=0;const proxy=net.createServer(socket=>{proxyCalls++;socket.destroy();}),proxyPort=await listen(proxy);
    const envNames=["HTTP_PROXY","HTTPS_PROXY","ALL_PROXY","http_proxy","https_proxy","all_proxy","NODE_USE_ENV_PROXY"];
    const saved=envNames.map(k=>process.env[k]);
    try{for(const k of envNames)process.env[k]=k==="NODE_USE_ENV_PROXY"?"1":`http://127.0.0.1:${proxyPort}`;
      success(await primary.send("status",f.proof(d)));assert.equal(proxyCalls,0);
    }finally{envNames.forEach((k,i)=>{if(saved[i]===undefined)delete process.env[k];else process.env[k]=saved[i];});await close(proxy);}
    for(const code of [300,301,302,303,304,305,307,308])for(const location of [origin+handoffHttpsPaths.status,"https://unreachable.invalid/redirect"]){let hits=0;
      const s=https.createServer(certs.current,(_req,res)=>{hits++;res.writeHead(code,{location});res.end();}),p=await listen(s);
      safeFailure(await client(config(p)).send("status",f.proof(d)),"redirect_denied");assert.equal(hits,1);await close(s);
    }
  });
  await t.test("bounded JSON, chunked/oversized responses and sealed connect/read/deadline timers",async()=>{
    const cases:Array<(req:IncomingMessage,res:ServerResponse)=>void>=[
      (_q,r)=>{r.writeHead(200,{"content-type":"application/json","content-length":"9000"});r.end("x");},
      (_q,r)=>{r.writeHead(200,{"content-type":"application/json"});r.write("{");r.end("}");},
      (_q,r)=>{r.writeHead(200,{"content-type":"application/json","content-length":"4"});r.end("oops");},
      (_q,r)=>{r.writeHead(200,{"content-type":"application/json","content-length":"2"});r.end(Buffer.from([255,255]));},
      (_q,r)=>{const b=JSON.stringify({data:{...f.model.rows[0],deviceSecret:"redaction-sentinel"}});r.writeHead(200,{"content-type":"application/json","content-length":Buffer.byteLength(b)});r.end(b);}
    ];
    for(const handler of cases){const s=https.createServer(certs.current,handler),p=await listen(s);safeFailure(await client(config(p)).send("status",f.proof(d)),"response_invalid");await close(s);}
    const stalled=net.createServer(),sp=await listen(stalled);
    safeFailure(await client(config(sp,certs.current,{timeouts:{connectMs:50,readMs:100,deadlineMs:200}})).send("status",f.proof(d)),"connect_timeout");await close(stalled);
    const idle=https.createServer(certs.current,()=>{}),ip=await listen(idle);
    safeFailure(await client(config(ip,certs.current,{timeouts:{connectMs:200,readMs:50,deadlineMs:300}})).send("status",f.proof(d)),"delivery_unknown");await close(idle);
    const timers=new Set<NodeJS.Timeout>();const trickle=https.createServer(certs.current,(_q,r)=>{r.writeHead(200,{"content-type":"application/json","content-length":"8000"});
      const timer=setInterval(()=>r.write(" "),20);timers.add(timer);r.on("close",()=>{clearInterval(timer);timers.delete(timer);});});const tp=await listen(trickle);
    safeFailure(await client(config(tp,certs.current,{timeouts:{connectMs:100,readMs:100,deadlineMs:150}})).send("status",f.proof(d)),"delivery_unknown");await close(trickle);for(const timer of timers)clearInterval(timer);timers.clear();
    assert.equal(timers.size,0);
  });
  await t.test("commit then socket loss is unknown, with zero retry and new-request owner recovery",async()=>{
    const lost=f.requestBase();lost.replacesRequestId=d.requestId;const c=client(config(port));const requested=success(await c.send("request",f.wire(lost)));lost.userCode=requested.userCode;
    await approve(f,lost,"rotate");const before=handlers,count=f.delivered.length;lose=true;
    safeFailure(await c.send("poll",f.proof(lost)),"delivery_unknown");assert.equal(handlers,before+1);assert.equal(f.delivered.length,count+1);
    safeFailure(await c.send("poll",f.proof(lost)),"replay_denied");assert.equal(handlers,before+1);
    f.model.now=new Date(f.model.now.getTime()+handoffPolicy.ackTtlMs+1);
    assert.equal(success(await c.send("status",f.proof(lost))).state,"delivery_unknown");assert.ok(f.model.keys.at(-1)?.revokedAt);
    const recovery=f.requestBase();recovery.replacesRequestId=lost.requestId;const r=success(await c.send("request",f.wire(recovery)));recovery.userCode=r.userCode;
    const pre=success(await c.send("poll",f.proof(recovery)));assert.equal(pre.state,"requested");assert.ok(!pre.key);
    await approve(f,recovery);f.model.now=new Date(f.model.now.getTime()+1001);
    const delivered=success(await c.send("poll",f.proof(recovery)));assert.equal(success(await c.send("ack",acknowledge(recovery,delivered))).state,"acknowledged");
    assert.equal(f.model.keys.filter(k=>k.active).length,1);f.wipe(lost);f.wipe(recovery);
  });
  await t.test("cleanup and diagnostics expose no raw proofs, secrets, cert keys or authority",async()=>{
    for(const b of [d.deviceSecret,d.challenge]){assert.ok(!JSON.stringify(responseErrors).includes(b.toString("base64url")));assert.ok(!logs.join("\n").includes(b.toString("base64url")));}
    assert.ok(!JSON.stringify(responseErrors).includes("redaction-sentinel"));assert.ok(!logs.join("\n").includes("PRIVATE KEY"));
    assert.ok(f.buffers.every(b=>b.every(v=>v===0)));f.wipe(d);
    const launch=require("../../scripts/lib/agent-host-hermes-launch-contract.cjs");
    for(const flag of ["implementationReady","executionSupported","pilotReady","liveAdmissionAllowed","pilotExecutionAuthorized","pilotExecutionStarted"])assert.equal(launch[flag],false);
    assert.equal(primary.transportQualified,false);assert.equal(primary.launchAuthority,false);assert.equal(f.model.tickets[0].state,"issued");assert.equal(f.model.claims[0].blocked,false);
    for(const c of clients)c.close();await close(server);await new Promise(r=>setTimeout(r,20));assert.equal(sockets.size,0);assert.equal(servers.size,0);
    safeFailure(await primary.send("status",{}),"unavailable");
  });
});
