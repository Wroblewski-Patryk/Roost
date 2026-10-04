import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';
import { composeHealthSettingsSchema, probeComposeHealth, createComposeHealthProbe }
  from './lib/agent-host-release-compose-health.mjs';

const commit='a'.repeat(40),other='b'.repeat(40),metaName='sample-build-revision',cert=Buffer.from('fixture-certificate');
const health={frontendMetaName:metaName,requireReleaseReadiness:true,requireReflectionReadiness:true,
  certificateSha256:createHash('sha256').update(cert).digest('hex')};
const backend=()=>({status:'ok',deployment:{runtime_build_revision:commit},release_readiness:{ready:true},reflection:{deployment_readiness:{ready:true}}});
const html=()=>`<!doctype html><html><head><meta name="${metaName}" content="${commit}"></head><body></body></html>`;
function fixture(overrides={}){
  const requests=[],responses=[],requestsClosed=[];
  const request=(url,options,callback)=>{
    const kind=url.pathname==='/health'?'backend':'frontend',row=overrides[kind]??{};
    requests.push({url:url.toString(),options});const req=new EventEmitter();req.destroy=()=>{requestsClosed.push(kind);req.emit('close');};
    req.end=()=>queueMicrotask(()=>{
      if(row.requestEvent){req.emit(row.requestEvent,row.error??{code:'ECONNRESET'});return;}
      const response=new EventEmitter();response.statusCode=row.status??200;
      response.headers={'content-type':kind==='backend'?'application/json':'text/html',...(row.headers??{})};
      response.socket={getPeerCertificate:()=>({raw:row.cert??cert})};
      response.destroy=()=>{responses.push(kind);response.emit('close');};
      callback(response);
      if(row.event){response.emit(row.event);return;}
      const body=row.body??(kind==='backend'?JSON.stringify(backend()):html());
      response.emit('data',Buffer.isBuffer(body)?body:Buffer.from(body));response.emit('end');response.emit('close');
    });return req;
  };
  return {requests,responses,requestsClosed,request,probe:()=>probeComposeHealth({publicUrl:'https://app.example.test',expectedCommit:commit,health},{request})};
}

test('fixed TLS GET verifies separately served backend/frontend exact commit and required readiness, no bodies in evidence',async()=>{
  const f=fixture(),r=await f.probe();assert.equal(r.healthy,true);assert.equal(r.versionVerified,true);assert.match(r.healthDigest,/^[a-f0-9]{64}$/);
  assert.deepEqual(f.requests.map(r=>r.url),['https://app.example.test/health','https://app.example.test/']);
  for(const {options}of f.requests){assert.equal(options.method,'GET');assert.equal(options.agent,false);assert.equal(options.rejectUnauthorized,true);
    assert.equal(options.minVersion,'TLSv1.2');assert.equal(options.timeout,10000);assert.equal(options.maxHeaderSize,8192);
    assert.equal(options.headers['Accept-Encoding'],'identity');assert.equal(options.headers['Cache-Control'],'no-store');}
  assert.deepEqual(r.observations.map(r=>r.reason),['verified','verified']);assert(!JSON.stringify(r).includes('<html>'));assert(!JSON.stringify(r).includes('runtime_build_revision'));
});

for(const [reason,mutate]of [
  ['backend_status',v=>{v.status='degraded';}],
  ['backend_version',v=>{v.deployment.runtime_build_revision=other;}],
  ['backend_version',v=>{delete v.deployment;}],
  ['release_readiness',v=>{v.release_readiness.ready=false;}],
  ['release_readiness',v=>{v.release_readiness.ready='true';}],
  ['reflection_readiness',v=>{delete v.reflection.deployment_readiness;}]
])test(`backend independently refuses ${reason} (${String(mutate)})`,async()=>{
  const v=backend();mutate(v);const r=await fixture({backend:{body:JSON.stringify(v)}}).probe();
  assert.equal(r.healthy,false);assert.equal(r.versionVerified,reason!=='backend_version');assert.equal(r.observations[0].reason,reason);assert.equal(r.observations[1].healthy,true);
});

test('optional readiness flags never weaken exact backend version or status',async()=>{
  const f=fixture({backend:{body:JSON.stringify({status:'ok',deployment:{runtime_build_revision:commit}})}});
  const settings={...health,requireReleaseReadiness:false,requireReflectionReadiness:false};
  assert.equal((await probeComposeHealth({publicUrl:'https://app.example.test/',expectedCommit:commit,health:settings},{request:f.request})).healthy,true);
  const bad=fixture({backend:{body:JSON.stringify({status:'ok',deployment:{runtime_build_revision:other}})}});
  assert.equal((await probeComposeHealth({publicUrl:'https://app.example.test',expectedCommit:commit,health:settings},{request:bad.request})).healthy,false);
});
test('bounded backend readiness catalog can exceed the smaller frontend bound',async()=>{
  const body=JSON.stringify({...backend(),catalog:'x'.repeat(70000)});
  const result=await fixture({backend:{body}}).probe();
  assert.equal(result.healthy,true);assert.equal(result.versionVerified,true);
  assert(!JSON.stringify(result).includes('catalog'));
});
test('frontend independently retains its 64 KiB response bound',async()=>{
  const result=await fixture({frontend:{body:html()+' '.repeat(65536)}}).probe();
  assert.equal(result.healthy,false);assert.equal(result.observations[1].reason,'body_limit');
});

for(const [label,body,reason]of [
  ['wrong frontend revision',`<meta name="${metaName}" content="${other}">`,'frontend_version'],
  ['wrong metadata name',`<meta name="other-build-revision" content="${commit}">`,'frontend_meta_missing'],
  ['missing version metadata','<html><head></head></html>','frontend_meta_missing'],
  ['duplicated metadata',html()+html(),'frontend_meta_duplicate'],
  ['encoded content',`<meta name="${metaName}" content="&#97;${commit.slice(1)}">`,'frontend_meta_encoding'],
  ['encoded name',`<meta name="sample&#45;build-revision" content="${commit}">`,'frontend_meta_encoding'],
  ['encoded duplicate',html()+`<meta name="sample&#45;build-revision" content="${commit}">`,'frontend_meta_duplicate'],
  ['duplicate attributes',`<meta name="${metaName}" name="other" content="${commit}">`,'frontend_meta_invalid'],
  ['script text',`<script>const fixture='<meta name="${metaName}" content="${commit}">';</script>`,'frontend_meta_missing'],
  ['comment',`<!-- <meta name="${metaName}" content="${commit}"> -->`,'frontend_meta_missing'],
  ['nested template',`<template><template>ignored</template><meta name="${metaName}" content="${commit}"></template>`,'frontend_meta_missing'],
  ['title text',`<title><meta name="${metaName}" content="${commit}"></title>`,'frontend_meta_missing']
])test(`frontend refuses ${label}`,async()=>{const r=await fixture({frontend:{body}}).probe();assert.equal(r.healthy,false);assert.equal(r.observations[1].reason,reason);});

test('HTML attribute case/quotes/order/whitespace obey normal HTML semantics, fake raw text ignored',async()=>{
  const body=`<script>let irrelevant='<meta name="${metaName}" content="${other}">';</script><META CONTENT='${commit}' NAME=${metaName} />`;
  assert.equal((await fixture({frontend:{body}}).probe()).healthy,true);
});

for(const [label,row,reason]of [
  ['redirect',{headers:{location:'https://other.example.test/'}},'redirect'],
  ['encoded response',{headers:{'content-encoding':'gzip'}},'encoded_response'],
  ['wrong HTTP status',{status:503},'http_status'],
  ['wrong content type',{headers:{'content-type':'text/plain'}},'content_type'],
  ['certificate pin mismatch',{cert:Buffer.from('other-certificate')},'certificate_pin'],
  ['body limit',{body:Buffer.alloc(131073,65)},'body_limit'],
  ['invalid UTF8',{body:Buffer.from([0xff])},'payload_invalid'],
  ['response closed',{event:'close'},'connection_closed'],
  ['response aborted',{event:'aborted'},'connection_closed'],
  ['response error',{event:'error'},'response_error'],
  ['request closed',{requestEvent:'close'},'connection_closed'],
  ['request timeout',{requestEvent:'timeout'},'transport_timeout'],
  ['request reset',{requestEvent:'error'},'connection_closed']
])test(`bounded transport refuses ${label} and settles once`,async()=>{
  const f=fixture({backend:row}),r=await f.probe();assert.equal(r.healthy,false);assert.equal(r.observations[0].reason,reason);
  assert.equal(r.observations.length,2);assert.equal(r.observations[1].reason,'verified');
  assert(!JSON.stringify(r).includes('other-certificate'));assert(!JSON.stringify(r).includes('other.example.test'));
});

test('health check requires strict JSON and never echoes secret-bearing invalid response',async()=>{
  const f=fixture({backend:{body:'secret-value-not-json'}}),r=await f.probe();
  assert.equal(r.observations[0].reason,'backend_payload_invalid');assert(!JSON.stringify(r).includes('secret-value'));
});

test('installation metadata/pins/readiness are typed and no callbacks or executable selectors are accepted',()=>{
  for(const valueof of [
    {...health,frontendMetaName:'bad name'},{...health,frontendMetaName:'x'.repeat(81)},
    {...health,frontendMetaName:'<script>'},{...health,certificateSha256:'wrong'},
    {...health,requireReleaseReadiness:'true'},{...health,module:'other-code'}
  ])assert.equal(composeHealthSettingsSchema.safeParse(valueof).success,false);
});

test('sealed public origin cannot be overridden or augmented with credentials/path/query/fragment',async()=>{
  const f=fixture(),probe=createComposeHealthProbe({publicUrl:'https://app.example.test',health},{request:f.request});
  for(const publicUrl of ['http://app.example.test','https://user:private@app.example.test/','https://app.example.test/health',
    'https://app.example.test/?secret=query','https://app.example.test/#fragment','not a URL']){
    await assert.rejects(probeComposeHealth({publicUrl,expectedCommit:commit,health},{request:f.request}),/scope_invalid/);
  }
  await assert.rejects(probe({expectedCommit:commit,publicUrl:'https://other.example.test'}),/scope_changed/);
  await assert.rejects(probe({expectedCommit:commit,health:{}}),/scope_invalid/);
  await assert.rejects(probe({expectedCommit:'not-a-commit'}));assert.equal(f.requests.length,0);
  assert.equal((await probe({expectedCommit:commit,publicUrl:'https://app.example.test/'})).healthy,true);
});
