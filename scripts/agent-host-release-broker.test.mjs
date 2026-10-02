import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import contract from './lib/agent-host-release-contract.cjs';
import { runReleaseStep,nextReleaseOperation } from './lib/agent-host-release-broker.mjs';

function fixture(){
 const id=randomUUID(),commit='a'.repeat(40),base='b'.repeat(40),tree='c'.repeat(40),hash='d'.repeat(64),at=new Date().toISOString();
 const prior={commit:base,imageDigest:`sha256:${'1'.repeat(64)}`,configDigest:hash,schemaDigest:hash};
 const manifest={schemaVersion:'roost-release-manifest-v1',repository:{url:'https://github.com/example/certificate',defaultBranch:'main',canonicalDir:'C:\\Certification\\one',candidateBranch:'codex/certificate'},deployment:{provider:'coolify',targetId:'certificate',controllerUrl:'https://controller.example.test',url:'https://certificate.example.test',imageDigest:`sha256:${'2'.repeat(64)}`,configDigest:hash,schemaDigest:hash},services:[{name:'api',healthUrl:'https://certificate.example.test/health',expectedStatus:200}],baseline:{...prior,healthDigest:hash,dataDigest:hash,observedAt:at},observation:{seconds:1,intervalSeconds:1,maxFailures:0},backup:{digest:hash,bytes:100,capturedAt:at,restoreVerifiedAt:at,restoreDigest:hash},rollback:{...prior,compatibleSchemaDigests:[hash]},cleanup:{repositoryUrl:'https://github.com/example/certificate',canonicalDir:'C:\\Certification\\one',coolifyTargetId:'certificate',ownedResourceIds:['certificate'],archiveRepository:true}};
 const snapshot={requestId:randomUUID(),taskId:randomUUID(),applicationId:randomUUID(),hostId:randomUUID(),releaseExecutionId:randomUUID(),releaserAgentId:randomUUID(),releaserCredentialId:randomUUID(),credentialVersion:1,reviewId:randomUUID(),materialVersion:hash,commit,candidateTree:tree,baseCommit:base,baseTree:'e'.repeat(40),releaserRevision:at,expiresAt:new Date(Date.now()+60000).toISOString(),manifest,manifestDigest:contract.releaseDigest(manifest),readinessDigest:hash,configurationDigest:hash};
 return{release:{id,manifestDigest:snapshot.manifestDigest,snapshot},journal:[],status:'active',expectedVersion:hash};
}
function harness(state,overrides={}){
 const calls=[];
 const api=async(route,{body})=>{
  calls.push({kind:'api',route,body});
  if(route.endsWith('/operations')){
   const op={id:randomUUID(),operation:body.operation,intent:body,createdAt:new Date().toISOString(),outcome:null};state.journal.push(op);
   return{...state,operation:op,replayed:false};
  }
  const op=state.journal.find(x=>route.includes(x.id));op.outcome=body;return state;
 };
 const args={state,client:{hostId:state.release.snapshot.hostId,agentId:state.release.snapshot.releaserAgentId},api,
  assertWriter:async()=>calls.push({kind:'writer'}),inspectCheckout:async()=>calls.push({kind:'checkout'}),
  github:{inspect:async()=>({remoteBase:state.release.snapshot.baseCommit,remoteTree:state.release.snapshot.baseTree}),push:async()=>{calls.push({kind:'effect'});return{remoteCommit:state.release.snapshot.commit,remoteTree:state.release.snapshot.candidateTree};},
   reconcile:async()=>{calls.push({kind:'readonly_reconcile'});return{status:'succeeded',evidence:{remoteCommit:state.release.snapshot.commit,remoteTree:state.release.snapshot.candidateTree}};}},
  coolify:{inspect:async()=>calls.push({kind:'baseline'})},resources:{},...overrides};
 return{args,calls,state};
}
test('server intent is durable before the first external effect',async()=>{
 const h=harness(fixture());await runReleaseStep(h.args);
 assert.ok(h.calls.findIndex(c=>c.kind==='api'&&c.route.endsWith('/operations'))<h.calls.findIndex(c=>c.kind==='effect'));
 assert.equal(h.state.journal[0].outcome.status,'succeeded');
});
test('lost authorization response cannot perform an external operation',async()=>{
 const h=harness(fixture(),{api:async()=>{throw Error('lost');}});await assert.rejects(runReleaseStep(h.args));
 assert.ok(!h.calls.some(c=>c.kind==='effect'));
});
test('remote tree mismatch cannot be replaced with the expected tree in an intent',async()=>{
 const h=harness(fixture());h.args.github.inspect=async()=>({remoteBase:h.state.release.snapshot.baseCommit,remoteTree:'f'.repeat(40)});
 await assert.rejects(runReleaseStep(h.args),/release_base_changed/);
 assert.ok(!h.calls.some(c=>c.kind==='api'||c.kind==='effect'));
});
test('uncertain push is reported once and next step only reconciles',async()=>{
 const h=harness(fixture());h.args.github.push=async()=>{h.calls.push({kind:'effect'});throw Error('reply lost');};
 const result=await runReleaseStep(h.args);assert.equal(result.reconciliationRequired,true);assert.equal(h.state.journal[0].outcome.status,'uncertain');
 await runReleaseStep(h.args);assert.equal(h.calls.filter(c=>c.kind==='effect').length,1);
 assert.equal(h.calls.filter(c=>c.kind==='readonly_reconcile').length,1);
 assert.equal(h.state.journal[0].outcome.status,'reconciled');
});
test('uncertain effects expose only fixed transport diagnostics outside the journal',async()=>{
 for(const diagnostic of ['response_unproven_http_422','transport_uncertain','secret-value','response_invalid\ncredential']){
  const h=harness(fixture());h.args.github.push=async()=>{throw Object.assign(Error('private credential-bearing response'),{transportDiagnostic:diagnostic});};
  const result=await runReleaseStep(h.args);
  assert.equal(result.uncertaintyDiagnostic,['response_unproven_http_422','transport_uncertain'].includes(diagnostic)?diagnostic:'release_effect_unproven');
  assert.equal(JSON.stringify(h.state.journal).includes('private credential-bearing response'),false);
  assert.equal('uncertaintyDiagnostic' in h.state.journal[0].outcome,false);
 }
});
test('shutdown after intent preserves pending operation without invoking push',async()=>{
 const h=harness(fixture());h.args.stopped=()=>h.state.journal.length>0;
 await assert.rejects(runReleaseStep(h.args),/effect_not_started/);
 assert.equal(h.state.journal.length,1);assert.equal(h.state.journal[0].outcome,null);assert.ok(!h.calls.some(c=>c.kind==='effect'));
});
test('wrong host or releaser cannot use another agent release queue',async()=>{
 for(const field of ['hostId','agentId']){const h=harness(fixture());h.args.client[field]=randomUUID();await assert.rejects(runReleaseStep(h.args),/binding_changed/);assert.equal(h.calls.length,0);}
});
test('renewed authority keeps the immutable grant while allowing its authorized effect',async()=>{
 const state=fixture();state.release.snapshot.expiresAt=new Date(Date.now()-60000).toISOString();state.effectiveExpiresAt=new Date(Date.now()+60000).toISOString();
 const original=JSON.stringify(state.release.snapshot),h=harness(state);await runReleaseStep(h.args);
 assert.equal(JSON.stringify(state.release.snapshot),original);assert.equal(h.calls.filter(c=>c.kind==='effect').length,1);
});
test('expired or malformed effective authority cannot perform an effect',async()=>{
 for(const expiry of [new Date(Date.now()-60000).toISOString(),'invalid']){
  const h=harness(fixture());h.state.effectiveExpiresAt=expiry;
  await assert.rejects(runReleaseStep(h.args),/release_effect_not_started|release_expiry_unproven/);
  assert.equal(h.calls.filter(c=>c.kind==='effect').length,0);
 }
});
test('rollback requires separate configuration and observation before cleanup',()=>{
 const state=fixture();state.journal=[{operation:'deploy',outcome:{status:'failed'}},{operation:'rollback_config',outcome:{status:'succeeded'}}];
 assert.equal(nextReleaseOperation(state),'rollback');state.journal.push({operation:'rollback',outcome:{status:'succeeded'}});
 assert.equal(nextReleaseOperation(state),'observe');state.journal.push({operation:'observe',intent:{parameters:{mode:'rollback'}},outcome:{status:'succeeded'}});
 assert.equal(nextReleaseOperation(state),'cleanup_resource');
});
