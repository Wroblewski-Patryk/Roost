import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import net from 'node:net';import tls from 'node:tls';import http from 'node:http';import https from 'node:https';
import dns from 'node:dns';import childProcess from 'node:child_process';
import {createCanonicalBootstrapCompletion} from '../modules/api-keys/bootstrap-canonical-completion';
import {createCanonicalCompletionPublicVerifier,completionPublicVerifierContract} from '../modules/api-keys/bootstrap-canonical-completion-verifier';
import {canonicalCompletionFixture} from './bootstrap-canonical-completion-fixture';
import {lifecycleFlags} from '../modules/api-keys/bootstrap-ticket-lifecycle-contract';

// No signature vector: these are authority-denial tests. They must not be
// reported as RFC8032, Ed25519, rotation or production signer qualification.
test('canonical completion public verifier: missing signer authority remains blocked',async t=>{
 let effects=0;const forbidden=()=>{effects++;throw Error('external or private-key effect forbidden');};
 for(const m of ['connect','createConnection'] as const)t.mock.method(net,m,forbidden);t.mock.method(net.Server.prototype,'listen',forbidden);t.mock.method(tls,'connect',forbidden);
 for(const mod of [http,https])for(const m of ['request','get'] as const)t.mock.method(mod,m,forbidden);
 for(const m of ['lookup','resolve','resolve4','resolve6'] as const){t.mock.method(dns,m,forbidden);t.mock.method(dns.promises,m,forbidden);}
 t.mock.method(globalThis,'fetch',forbidden);for(const m of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'] as const)t.mock.method(childProcess,m,forbidden);
 for(const m of ['generateKeyPair','generateKeyPairSync','createPrivateKey','sign','verify'] as const)t.mock.method(crypto,m,forbidden);
 const logs:unknown[]=[];for(const m of ['log','warn','error'] as const)t.mock.method(console,m,(...v:unknown[])=>logs.push(v));

 for(const purpose of ['first_enrollment','owner_recovery'] as const)await t.test(`${purpose}: explicit injection denies before writes or credential inspection`,async()=>{
  const f=await canonicalCompletionFixture(purpose),before=f.state(),verifier=createCanonicalCompletionPublicVerifier();
  const result=await createCanonicalBootstrapCompletion({...f.deps,verifier}).complete(f.input);
  assert.equal(result.ok,false);assert.equal('error' in result&&result.error,'denied');
  assert.equal(result.completionRecorded,false);assert.equal(result.credentialActivated,false);assert.equal(result.retryable,false);
  assert.deepEqual(f.stats(),{writes:0,activations:0});assert.deepEqual(f.state(),before);assert.equal(f.providerDbs.length,0);
  for(const flag of Object.keys(lifecycleFlags))assert.equal((result as any)[flag],false);
  assert.ok(Object.isFrozen(verifier)&&Object.isFrozen(verifier.contract)&&Object.isFrozen(verifier.contract.blockers)&&Object.isFrozen(verifier.contract.domains));
  assert.equal(verifier.contract.status,'blocked');assert.equal(verifier.contract.cryptographyQualified,false);assert.equal(verifier.contract.signerAuthorityQualified,false);
 });
 await t.test('default composition still has no verifier and performs no writes',async()=>{
  const f=await canonicalCompletionFixture();const result=await createCanonicalBootstrapCompletion().complete(f.input);
  assert.equal(result.ok,false);assert.deepEqual(f.stats(),{writes:0,activations:0});assert.equal(f.calls.length,0);
 });
 await t.test('an existing purpose, invented signer or throwing Db cannot bypass the blocker',async()=>{
  const verifier=createCanonicalCompletionPublicVerifier(),hostile=new Proxy({},{get(){throw Error('must not consult an unbound Db or caller-supplied authority');}});
  for(const kind of ['peer','completion','binding'] as const){
   for(const purpose of ['worker-bootstrap-owner-ticket-v1','owner-decision-attestation-v1','bootstrap-current-owner-decision-v1','invented-worker-purpose'])
    assert.equal(await verifier.verify(hostile as any,{kind,domain:completionPublicVerifierContract.domains[kind],purpose,current:true,verified:true} as any),false);
   assert.equal(await verifier.verify(hostile as any,hostile as any),false);
  }
 });
 await t.test('twenty concurrent injected completions cannot create authority or activate a candidate',async()=>{
  const f=await canonicalCompletionFixture(),before=f.state(),verifier=createCanonicalCompletionPublicVerifier();
  const results=await Promise.all(Array.from({length:20},()=>createCanonicalBootstrapCompletion({...f.deps,verifier}).complete(structuredClone(f.input))));
  assert.ok(results.every(r=>!r.ok&&!r.completionRecorded&&!r.credentialActivated));
  assert.deepEqual(f.stats(),{writes:0,activations:0});assert.deepEqual(f.state(),before);assert.equal(f.providerDbs.length,0);
 });
 assert.equal(effects,0);assert.deepEqual(logs,[]);
});
