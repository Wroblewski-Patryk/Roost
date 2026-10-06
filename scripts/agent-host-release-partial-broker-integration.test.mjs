// Synthetic broker/adapter round trip. No real transport, native process,
// credential, source change or deployment. Imported fixture tests are counted
// separately by node:test; the cases below test the actual broker/adapter code.
import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {createRequire} from 'node:module';
import contract from './lib/agent-host-release-contract.cjs';
import {runReleaseStep,nextReleaseOperation} from './lib/agent-host-release-broker.mjs';
import {createCoolifyComposeAdapter} from './lib/agent-host-release-coolify-compose.mjs';
const req=createRequire(import.meta.url),{require:ts}=req('tsx/cjs/api'),{partialFixture}=ts('../src/tests/governed-release-compose-partial-recovery-contract.test.ts',import.meta.url),H='9'.repeat(64);
function setup({pending=false}={}){const f=partialFixture(),at=new Date().toISOString(),s={...f.release.snapshot,requestId:randomUUID(),taskId:randomUUID(),applicationId:randomUUID(),hostId:randomUUID(),
 releaseExecutionId:randomUUID(),releaserAgentId:randomUUID(),releaserCredentialId:randomUUID(),credentialVersion:1,reviewId:randomUUID(),materialVersion:H,
 releaserRevision:at,expiresAt:new Date(Date.now()+60000).toISOString(),readinessDigest:H,configurationDigest:H},
 state={release:{id:f.release.id,manifestDigest:s.manifestDigest,snapshot:s},status:'active',expectedVersion:H,
 journal:['push','pr','review','merge','deploy_config'].map(operation=>({id:randomUUID(),operation,outcome:{status:'succeeded'},intent:{parameters:{}}}))},
 calls=[];let dispatched=pending,configuration=structuredClone(f.target.configuration);
 if(pending)state.journal.push({...f.op,outcome:{status:'uncertain',evidence:{observedAt:at}}});
 const gateway={inspectConfiguration:async()=>configuration,
  inspectBaseline:async()=>{throw Error('unexpected healthy baseline read');},inspectRuntime:async()=>{throw Error('unexpected successful-runtime read');},
  readQueue:async o=>{calls.push({kind:'queue_read',context:o});return dispatched?structuredClone(f.r.queue):null;},
  configure:async(_target,phase)=>{calls.push({kind:'configure',phase});configuration=structuredClone(phase==='rollback'?f.target.rollbackConfiguration:f.target.configuration);},
  deployTarget:async o=>{calls.push({kind:'candidate_dispatch',context:o});dispatched=true;},
  safety:async()=>({quiescent:true,schemaDigest:f.m.deployment.schemaDigest,dataDigest:f.m.baseline.dataDigest}),
  checkServices:async()=>{throw Error('unexpected healthy probe');},inspectBackup:async()=>f.m.backup,
  inspectRecovery:async o=>{calls.push({kind:'partial_read',context:o});assert.deepEqual(o.operationIntent,state.journal.at(-1).intent);return structuredClone(f.evidence);}},
 adapter=createCoolifyComposeAdapter({gateway,now:()=>Date.parse('2026-10-04T12:03:12.000Z'),sleep:async()=>{throw Error('unexpected wait');}}),
 api=async(route,{body})=>{calls.push({kind:'api',route,body});if(route.endsWith('/operations')){
  const op={id:body.operation==='deploy'?f.op.id:randomUUID(),operation:body.operation,createdAt:f.op.createdAt,intent:body,outcome:null};state.journal.push(op);return{...state,operation:op,replayed:false};}
  const op=state.journal.find(o=>route.includes(o.id));assert(op);op.outcome=body;return state;},
 args={state,client:{hostId:s.hostId,agentId:s.releaserAgentId},api,coolify:adapter,assertWriter:async()=>{},inspectCheckout:async()=>({commit:s.commit,tree:s.candidateTree}),
 github:{inspect:async()=>({remoteBase:s.commit,remoteTree:s.candidateTree}),push:async()=>{throw Error('Git replay forbidden');},merge:async()=>{throw Error('Git replay forbidden');}},
 resources:{inspectCapacity:async()=>{calls.push({kind:'capacity'});}}};return{f,state,calls,gateway,adapter,args};}
test('fresh candidate partial failure forwards FULL durable intent through adapter and records FAILED then planned rollback',async()=>{
 const x=setup();assert.equal(nextReleaseOperation(x.state),'deploy');await runReleaseStep(x.args);
 const last=x.state.journal.at(-1),read=x.calls.find(c=>c.kind==='partial_read');assert.equal(last.operation,'deploy');assert.equal(last.outcome.status,'failed');
 assert.equal(last.outcome.evidence.composeRecovery.kind,'queue_failed_partial');assert.equal(last.outcome.evidence.healthy,false);
 assert.deepEqual(read.context.operationIntent,last.intent);assert.equal(x.calls.filter(c=>c.kind==='candidate_dispatch').length,1);
 assert.equal(nextReleaseOperation(x.state),'rollback_config');await runReleaseStep(x.args);
 assert.equal(x.state.journal.at(-1).operation,'rollback_config');assert.equal(x.state.journal.at(-1).outcome.status,'succeeded');
 assert.equal(nextReleaseOperation(x.state),'rollback');assert.deepEqual(x.calls.filter(c=>c.kind==='configure').map(c=>c.phase),['rollback']);
 assert.equal(x.calls.filter(c=>c.kind==='candidate_dispatch').length,1);assert.equal(x.state.journal.filter(o=>o.operation==='deploy').length,1);
});
test('uncertain candidate partial queue reconciles FAILED through reads without a second dispatch or new candidate intent',async()=>{
 const x=setup({pending:true});assert.equal(nextReleaseOperation(x.state),'reconcile');const before=x.state.journal.length;
 await runReleaseStep({...x.args,reconciliationOnly:true});const last=x.state.journal.at(-1);
 assert.equal(x.state.journal.length,before);assert.equal(last.outcome.status,'reconciled');assert.equal(last.outcome.reconciledStatus,'failed');
 assert.equal(last.outcome.observationOnly,true);assert.equal(last.outcome.evidence.composeRecovery.kind,'queue_failed_partial');
 assert.equal(x.calls.filter(c=>c.kind==='candidate_dispatch').length,0);assert.equal(nextReleaseOperation(x.state),'rollback_config');
 assert.deepEqual(x.calls.find(c=>c.kind==='partial_read').context.operationIntent,x.f.op.intent);
});
test('adapter partial read refuses missing full intent before it can classify failure',async()=>{
 const x=setup({pending:true}),s={...x.state.release.snapshot,releaseId:x.state.release.id};
 x.gateway.inspectRecovery=async()=>structuredClone(x.f.evidence);
 // The installed adapter captured the same gateway object; direct partial
 // observation with only target parameters is intentionally insufficient.
 await assert.rejects(x.adapter.reconcileDeployment(x.f.m,s,{operationId:x.f.op.id,since:x.f.op.createdAt,targetId:x.f.target.targetId}),/recovery_unproven/);
});
test('forged partial health/data remains UNCERTAIN and cannot reach rollback effect',async()=>{
 const x=setup({pending:true});x.gateway.inspectRecovery=async()=>({...structuredClone(x.f.evidence),dataDigest:'0'.repeat(64)});
 await assert.rejects(runReleaseStep({...x.args,reconciliationOnly:true}),/recovery_unproven/);
 assert.equal(x.state.journal.at(-1).outcome.status,'uncertain');assert.equal(x.calls.filter(c=>c.kind==='candidate_dispatch'||c.kind==='configure').length,0);
});
