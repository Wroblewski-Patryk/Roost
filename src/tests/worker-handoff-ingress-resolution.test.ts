import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import { productionWorkerHandoffHandler, resolvedTrustedWorkerHandoffProxy, trustedWorkerHandoffProxy,
  type WorkerHandoffProxyLookup } from '../modules/api-keys/worker-handoff-http';

const keys=['ROOST_HANDOFF_HTTPS_ORIGIN','ROOST_HANDOFF_TLS_LEAF_SHA256','ROOST_HANDOFF_TRUSTED_PROXY_ADDRESS','ROOST_HANDOFF_TRUSTED_PROXY_HOST'] as const;
async function configured(run:()=>Promise<void>){
  const before=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  process.env.ROOST_HANDOFF_HTTPS_ORIGIN='https://api.example.test';
  process.env.ROOST_HANDOFF_TLS_LEAF_SHA256='a'.repeat(64);
  process.env.ROOST_HANDOFF_TRUSTED_PROXY_ADDRESS='10.25.0.4';
  process.env.ROOST_HANDOFF_TRUSTED_PROXY_HOST='fixture-proxy';
  try{await run();}finally{for(const key of keys)if(before[key]===undefined)delete process.env[key];else process.env[key]=before[key];}
}
const cleanHeaders=['Host','api.example.test','X-Forwarded-Host','api.example.test','X-Forwarded-Proto','https'];
const request=(patch:Record<string,unknown>={})=>({method:'POST',originalUrl:'/v1/worker-credential-handoff/poll',
  socket:{remoteAddress:'::ffff:10.25.0.2'},rawHeaders:[...cleanHeaders],headers:{},...patch}) as unknown as Request;
const resolver=(address='10.25.0.2'):WorkerHandoffProxyLookup=>async()=>[{address,family:4}];
const denied=(code:string,status:number)=>(error:unknown)=>{
  assert.equal((error as {code:string}).code,code);assert.equal((error as {status:number}).status,status);
  assert.equal((error as Error).message,code);return true;
};

test('installed service lookup pins one exact private socket peer and handles a changed Docker address',()=>configured(async()=>{
  let address='10.25.0.2';const queried:string[]=[];
  const lookup:WorkerHandoffProxyLookup=async host=>{queried.push(host);return [{address,family:4}];};
  const first=await resolvedTrustedWorkerHandoffProxy(request(),'poll',{resolver:lookup});
  assert.equal(first.qualification,'trusted_proxy_https_v1');assert.equal(first.certificateFingerprint,'a'.repeat(64));
  address='10.25.0.9';
  assert.equal((await resolvedTrustedWorkerHandoffProxy(request({socket:{remoteAddress:address}}),'poll',{resolver:lookup})).connectedOrigin,'https://api.example.test');
  await assert.rejects(resolvedTrustedWorkerHandoffProxy(request(),'poll',{resolver:lookup}),denied('worker_handoff_transport_invalid',403));
  assert.deepEqual(queried,['fixture-proxy','fixture-proxy','fixture-proxy']);
}));

test('legacy literal installation preserves synchronous and asynchronous qualification without DNS',()=>configured(async()=>{
  delete process.env.ROOST_HANDOFF_TRUSTED_PROXY_HOST;
  process.env.ROOST_HANDOFF_TRUSTED_PROXY_ADDRESS='10.25.0.2';
  const forbidden:WorkerHandoffProxyLookup=async()=>{throw Error('DNS must not run');};
  assert.deepEqual(await resolvedTrustedWorkerHandoffProxy(request(),'poll',{resolver:forbidden}),trustedWorkerHandoffProxy(request(),'poll'));
  process.env.ROOST_HANDOFF_TRUSTED_PROXY_HOST='';
  assert.deepEqual(await resolvedTrustedWorkerHandoffProxy(request(),'poll',{resolver:forbidden}),trustedWorkerHandoffProxy(request(),'poll'));
  process.env.ROOST_HANDOFF_TRUSTED_PROXY_ADDRESS='fd12::2';
  const ipv6=request({socket:{remoteAddress:'fd12::2'}});
  assert.deepEqual(await resolvedTrustedWorkerHandoffProxy(ipv6,'poll',{resolver:forbidden}),trustedWorkerHandoffProxy(ipv6,'poll'));
}));

test('proxy name must be one installed lowercase Docker label; invalid host never falls back to literal IP',()=>configured(async()=>{
  let calls=0;const lookup:WorkerHandoffProxyLookup=async()=>{calls++;return [{address:'10.25.0.2',family:4}];};
  for(const host of [' ', 'proxy.example.test','proxy.','proxy:53','10.25.0.2','2130706433','::1','proxy/name',' proxy','proxy ',
    '-proxy','proxy-','Proxy','proxy\nother','10.0.0.0/8','a'.repeat(64)]){
    process.env.ROOST_HANDOFF_TRUSTED_PROXY_HOST=host;
    await assert.rejects(resolvedTrustedWorkerHandoffProxy(request(),'poll',{resolver:lookup}),denied('worker_handoff_unavailable',503));
  }
  assert.equal(calls,0);
  process.env.ROOST_HANDOFF_TRUSTED_PROXY_HOST='a'.repeat(63);
  assert.equal((await resolvedTrustedWorkerHandoffProxy(request(),'poll',{resolver:lookup})).tlsValidated,true);
  assert.equal(calls,1);
}));

test('lookup requires exactly one RFC1918 IPv4; public, loopback, IPv6 and multiple addresses fail closed',()=>configured(async()=>{
  for(const address of ['10.0.0.2','172.16.0.2','172.31.255.2','192.168.1.2'])
    assert.equal((await resolvedTrustedWorkerHandoffProxy(request({socket:{remoteAddress:address}}),'poll',{resolver:resolver(address)})).tlsValidated,true);
  const records=[[],[{address:'198.51.100.2',family:4}],[{address:'127.0.0.1',family:4}],
    [{address:'169.254.1.2',family:4}],[{address:'172.15.0.2',family:4}],[{address:'172.32.0.2',family:4}],
    [{address:'::ffff:10.25.0.2',family:6}],[{address:'fd12::2',family:6}],[{address:'10.25.0.2',family:6}],
    [{address:'10.25.0.2/32',family:4}],[{address:'10.25.0.2',family:4},{address:'10.25.0.3',family:4}],
    [{address:'10.25.0.2',family:4},{address:'10.25.0.2',family:4}]];
  for(const addresses of records)
    await assert.rejects(resolvedTrustedWorkerHandoffProxy(request(),'poll',{resolver:async()=>addresses}),denied('worker_handoff_unavailable',503));
}));

test('DNS errors and bounded timeout expose only the fixed unavailable code',()=>configured(async()=>{
  await assert.rejects(resolvedTrustedWorkerHandoffProxy(request(),'poll',{resolver:async()=>{throw Error('DNS internal private diagnostic');}}),denied('worker_handoff_unavailable',503));
  const started=Date.now();
  await assert.rejects(resolvedTrustedWorkerHandoffProxy(request(),'poll',{resolver:()=>new Promise(()=>{}),timeoutMs:10}),denied('worker_handoff_unavailable',503));
  assert(Date.now()-started<1000,'unresolved lookup must not hold the handler indefinitely');
  for(const timeoutMs of [0,-1,1001,1.5])
    await assert.rejects(resolvedTrustedWorkerHandoffProxy(request(),'poll',{resolver:resolver(),timeoutMs}),denied('worker_handoff_unavailable',503));
}));

test('resolved ingress retains exact path, method, authority and sanitized forwarded HTTPS evidence',()=>configured(async()=>{
  const invalid=[{method:'GET'},{originalUrl:'/v1/worker-credential-handoff/poll?next=1'},
    {rawHeaders:[...cleanHeaders,'Host','api.example.test']},
    {rawHeaders:['Host','api.example.test,evil.example.test',...cleanHeaders.slice(2)]},
    {rawHeaders:[...cleanHeaders,'X-Forwarded-Proto','https']},
    {rawHeaders:['Host','api.example.test','X-Forwarded-Host','evil.example.test','X-Forwarded-Proto','https']},
    {rawHeaders:['Host','api.example.test','X-Forwarded-Host','api.example.test','X-Forwarded-Proto','http']},
    {rawHeaders:[...cleanHeaders,'X-Forwarded-Port','9443']},
    {rawHeaders:[...cleanHeaders,'X-Forwarded-Port','443','X-Forwarded-Port','443']},
    {headers:{forwarded:'for=10.25.0.2;proto=https'}}];
  for(const patch of invalid)
    await assert.rejects(resolvedTrustedWorkerHandoffProxy(request(patch),'poll',{resolver:resolver()}),denied('worker_handoff_transport_invalid',403));
  assert.equal((await resolvedTrustedWorkerHandoffProxy(request({rawHeaders:[...cleanHeaders,'X-Forwarded-Port','443']}),'poll',{resolver:resolver()})).tlsValidated,true);
}));

test('request bodies and spoofed client-address headers cannot select the installed name or socket peer',()=>configured(async()=>{
  const seen:string[]=[];const lookup:WorkerHandoffProxyLookup=async host=>{seen.push(host);return [{address:'10.25.0.2',family:4}];};
  const spoof={socket:{remoteAddress:'10.25.0.4'},body:{trustedProxyHost:'other-proxy',proxyAddress:'10.25.0.4',tlsValidated:true},
    headers:{'x-forwarded-for':'10.25.0.2','x-real-ip':'10.25.0.2'},rawHeaders:[...cleanHeaders,'X-Forwarded-For','10.25.0.2','X-Real-IP','10.25.0.2']};
  await assert.rejects(resolvedTrustedWorkerHandoffProxy(request(spoof),'poll',{resolver:lookup}),denied('worker_handoff_transport_invalid',403));
  assert.deepEqual(seen,['fixture-proxy']);
}));

test('async lookup uses one captured installed origin and certificate configuration',()=>configured(async()=>{
  const lookup:WorkerHandoffProxyLookup=async()=>{
    process.env.ROOST_HANDOFF_HTTPS_ORIGIN='https://other.example.test';
    process.env.ROOST_HANDOFF_TLS_LEAF_SHA256='b'.repeat(64);
    return [{address:'10.25.0.2',family:4}];
  };
  const transport=await resolvedTrustedWorkerHandoffProxy(request(),'poll',{resolver:lookup});
  assert.equal(transport.connectedOrigin,'https://api.example.test');assert.equal(transport.certificateFingerprint,'a'.repeat(64));
}));

test('production handler rejects invalid installed host before any credential service effect',()=>configured(async()=>{
  process.env.ROOST_HANDOFF_TRUSTED_PROXY_HOST='outside.example.test';
  let status:number|undefined,body:unknown,cache:string|undefined;
  const response={req:{requestId:'synthetic-ingress-request'},setHeader(name:string,value:string){if(name==='Cache-Control')cache=value;},
    status(value:number){status=value;return this;},json(value:unknown){body=value;return this;}} as unknown as Response;
  await productionWorkerHandoffHandler('request')(request({originalUrl:'/v1/worker-credential-handoff/request',body:{}}),response);
  assert.equal(status,503);assert.equal(cache,'no-store');assert.equal((body as {error:string}).error,'worker_handoff_unavailable');
}));
