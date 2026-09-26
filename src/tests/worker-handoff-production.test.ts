import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import type { Request } from 'express';
import { hashApiKey } from '../auth/api-key';
import { workerTicketFingerprint } from '../auth/worker-ticket-principal';
import { createWorkerHandoffService } from '../modules/api-keys/worker-handoff.service';
import { trustedWorkerHandoffProxy } from '../modules/api-keys/worker-handoff-http';
import { handoffAckProof } from '../modules/api-keys/worker-handoff-contract';
import { fixture, intent } from './worker-handoff-fixture';

test('production handoff discloses one credential and bound ACK token only once',async()=>{
 const f=fixture(),transport={qualification:'trusted_proxy_https_v1' as const,
  requestedOrigin:'https://worker.example.test:9443',connectedOrigin:'https://worker.example.test:9443',
  certificateFingerprint:'a'.repeat(64),tlsValidated:true,redirected:false,proxyOrigin:'https://worker.example.test:9443'};
 const delivery={qualification:'production_server_secret_v1' as const,
  async generate(){return Buffer.from('cc_v1_'+'A'.repeat(32));},
  async hash(raw:Buffer){return hashApiKey(raw.toString('utf8'));},
  async deliver(raw:Buffer){return raw.toString('utf8');}};
 const service=createWorkerHandoffService(f.store,{delivery,transport:async()=>transport},()=>f.model.now);
 const input=f.requestBase();
 const requested:any=await service('request',undefined,f.wire(input));
 assert.equal(requested.qualification,'production_https_v1');
 assert.equal(requested.transportQualified,true);
 assert.equal(requested.realProvisioningQualified,true);
 const command={requestId:randomUUID(),decisionId:randomUUID(),decisionRevision:1,explicitAcceptance:true,
  intent:intent(f,{...input,requestDigest:requested.binding.requestDigest})};
 const approved:any=await service('approve',f.ownerAuth,{requestId:input.requestId,userCode:requested.userCode,command});
 assert.equal(approved.state,'approved');
 const delivered:any=await service('poll',undefined,f.proof(input));
 assert.equal(delivered.state,'awaiting_ack');
 assert.equal(delivered.key,'cc_v1_'+'A'.repeat(32));
 assert.equal(delivered.ackProof,handoffAckProof(hashApiKey(delivered.key),input.requestId,delivered.responseDigest));
 assert.equal(f.model.keys.length,1);
 assert.equal(f.model.keys[0].active,false);
 assert.ok(!JSON.stringify(f.model).includes(delivered.key));
 assert.ok(!JSON.stringify(f.model).includes(delivered.ackProof));
 const replay:any=await service('poll',undefined,f.proof(input));
 assert.equal(replay.deliverySpent,true);assert.equal('key' in replay,false);assert.equal('ackProof' in replay,false);
 const ack:any=await service('ack',undefined,{...f.proof(input),credentialId:delivered.credential.id,
  credentialFingerprint:workerTicketFingerprint(hashApiKey(delivered.key)),
  responseDigest:delivered.responseDigest,ackProof:delivered.ackProof});
 assert.equal(ack.state,'acknowledged');assert.equal(f.model.keys[0].active,true);
 const duplicate:any=await service('ack',undefined,{...f.proof(input),credentialId:delivered.credential.id,
  credentialFingerprint:delivered.credential.fingerprint,responseDigest:delivered.responseDigest,ackProof:delivered.ackProof});
 assert.equal(duplicate.state,'acknowledged');assert.equal(f.model.operations.length,1);
 f.wipe(input);
});

test('trusted proxy evidence requires exact private ingress and sanitized HTTPS headers',()=>{
 const saved={origin:process.env.ROOST_HANDOFF_HTTPS_ORIGIN,pin:process.env.ROOST_HANDOFF_TLS_LEAF_SHA256,
  ingress:process.env.ROOST_HANDOFF_TRUSTED_PROXY_ADDRESS};
 process.env.ROOST_HANDOFF_HTTPS_ORIGIN='https://api.example.test';
 process.env.ROOST_HANDOFF_TLS_LEAF_SHA256='a'.repeat(64);
 process.env.ROOST_HANDOFF_TRUSTED_PROXY_ADDRESS='172.20.0.2';
 const headers=['Host','api.example.test','X-Forwarded-Host','api.example.test','X-Forwarded-Proto','https'];
 const request=(patch:Record<string,unknown>={})=>({method:'POST',
  originalUrl:'/v1/worker-credential-handoff/poll',socket:{remoteAddress:'::ffff:172.20.0.2'},
  rawHeaders:headers,headers:{},...patch}) as unknown as Request;
 try{
  const accepted=trustedWorkerHandoffProxy(request(),'poll');
  assert.equal(accepted.qualification,'trusted_proxy_https_v1');
  assert.equal(accepted.certificateFingerprint,'a'.repeat(64));
  for(const bad of [
   {socket:{remoteAddress:'172.20.0.3'}},
   {socket:{remoteAddress:'198.51.100.3'}},
   {rawHeaders:[...headers,'X-Forwarded-Proto','http']},
   {rawHeaders:[...headers,'X-Forwarded-Port','443','X-Forwarded-Port','443']},
   {rawHeaders:['Host','api.example.test','X-Forwarded-Host','evil.example.test','X-Forwarded-Proto','https']},
   {rawHeaders:['Host','api.example.test','X-Forwarded-Host','api.example.test','X-Forwarded-Proto','http']},
   {originalUrl:'/v1/worker-credential-handoff/poll?next=1'},
   {headers:{forwarded:'proto=https'}}
  ])assert.throws(()=>trustedWorkerHandoffProxy(request(bad),'poll'),/worker_handoff_transport_invalid/);
  process.env.ROOST_HANDOFF_TRUSTED_PROXY_ADDRESS='198.51.100.3';
  assert.throws(()=>trustedWorkerHandoffProxy(request(),'poll'),/worker_handoff_unavailable/);
 }finally{
  for(const [key,value] of Object.entries({ROOST_HANDOFF_HTTPS_ORIGIN:saved.origin,
   ROOST_HANDOFF_TLS_LEAF_SHA256:saved.pin,ROOST_HANDOFF_TRUSTED_PROXY_ADDRESS:saved.ingress}))
   if(value===undefined)delete process.env[key];else process.env[key]=value;
 }
});
