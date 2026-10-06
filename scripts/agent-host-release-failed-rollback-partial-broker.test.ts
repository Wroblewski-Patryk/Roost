// Controlled API and gateway; real adapter/broker/validators. These synthetic
// tests perform no network, credential, native process or application writes.
import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {failedRollbackPartialFixture} from '../src/tests/governed-release-compose-failed-rollback-partial.test';
import {releaseOutcomeError,releaseIntentError} from '../src/modules/agent-runtime/governed-release-contract';
import contract from './lib/agent-host-release-contract.cjs';
import {createCoolifyComposeAdapter} from './lib/agent-host-release-coolify-compose.mjs';
import {runReleaseStep,nextReleaseOperation} from './lib/agent-host-release-broker.mjs';
const clone=structuredClone,H='9'.repeat(64);
function setup(){const f:any=failedRollbackPartialFixture(),calls:any[]=[],instant=new Date().toISOString(),snapshot={...f.release.snapshot,
 requestId:randomUUID(),taskId:randomUUID(),applicationId:randomUUID(),hostId:randomUUID(),releaseExecutionId:randomUUID(),
 releaserAgentId:randomUUID(),releaserCredentialId:randomUUID(),credentialVersion:1,reviewId:randomUUID(),materialVersion:H,releaserRevision:instant,
 expiresAt:new Date(Date.now()+3600000).toISOString(),readinessDigest:H,configurationDigest:H};
 const state={release:{id:f.release.id,manifestDigest:contract.releaseDigest(f.m),snapshot},status:'active',expectedVersion:H,journal:f.journal};
 let evidence=clone(f.evidence),queue=clone(f.r.queue);
 const forbidden=(kind:string)=>async()=>{calls.push({kind});throw Error('unexpected_effect_'+kind);};
 const gateway={inspectConfiguration:forbidden('configuration_read'),inspectBaseline:forbidden('baseline_read'),inspectRuntime:forbidden('runtime_read'),
  readQueue:async(o:any)=>{calls.push({kind:'queue_read',o:clone(o)});return clone(queue);},
  inspectRecovery:async(o:any)=>{calls.push({kind:'recovery_read',o:clone(o)});return clone(evidence);},
  configure:forbidden('configuration_write'),deployTarget:forbidden('queue_dispatch'),safety:forbidden('safety'),checkServices:forbidden('health'),inspectBackup:forbidden('backup')};
 const adapter=createCoolifyComposeAdapter({gateway,now:()=>Date.parse('2026-10-04T12:06:00.000Z'),sleep:forbidden('sleep')});
 const api=async(route:string,{method,body}:any)=>{calls.push({kind:'api',route,method,body:clone(body)});
  assert.equal(route,`/v1/agent-runtime/releases/${state.release.id}/operations/${f.retry.id}/outcome`);assert.equal(method,'POST');
  assert(contract.outcomeSchema.safeParse(body).success);
  assert.equal(releaseOutcomeError({...state.release,manifest_digest:state.release.manifestDigest},f.retry,body,state.journal),null);
  f.retry.outcome={id:randomUUID(),...clone(body)};return state;
 };
 const args={state,client:{hostId:snapshot.hostId,agentId:snapshot.releaserAgentId},api,coolify:adapter,
  assertWriter:async()=>calls.push({kind:'writer'}),inspectCheckout:forbidden('checkout_read'),
  github:{inspect:forbidden('Git_read'),push:forbidden('Git_write'),reconcile:forbidden('Git_reconcile')},
  resources:{inspectCapacity:forbidden('capacity'),reconcilePostObservation:forbidden('post_observation')},
  onChildrenClosed:async()=>calls.push({kind:'native_closed'})};
 return {...f,state,args,calls,adapter,snapshot,setEvidence:(e:any)=>{evidence=clone(e);},setQueue:(q:any)=>{queue=clone(q);}};
}
function noEffects(x:any){assert.equal(x.calls.filter((c:any)=>['configuration_write','queue_dispatch','Git_write','post_observation'].includes(c.kind)).length,0);}
test('real adapter reads authoritative failed rollback queue and complete failed runtime without health claims',async()=>{const x=setup();
 const result=await x.adapter.reconcileDeployment(x.m,{...x.snapshot,releaseId:x.release.id},{rollback:true,since:x.retry.createdAt,
  operationId:x.retry.id,operationIntent:x.retry.intent,targetId:x.target.targetId});
 assert.equal(result.state,'failed');assert.deepEqual(result.evidence,x.evidence);
 assert.deepEqual(x.calls.map((c:any)=>c.kind),['queue_read','recovery_read']);assert.equal(result.evidence.healthy,false);
 for(const k of ['deployedCommit','deployedTree','artifactSetDigest','deployedSetDigest'])assert.equal(result.evidence[k],undefined);noEffects(x);
});
test('real broker persists sole immutable observation through controlled API and blocks every follow-up effect',async()=>{const x=setup(),count=x.state.journal.length,
 candidateBefore=clone(x.candidate.outcome),absenceBefore=clone(x.rollback.outcome),freshBefore=clone(x.retry.outcome);
 assert.equal(nextReleaseOperation(x.state),'reconcile');await runReleaseStep({...x.args,reconciliationOnly:true});
 assert.equal(x.state.journal.length,count);assert.deepEqual(x.candidate.outcome,candidateBefore);assert.deepEqual(x.rollback.outcome,absenceBefore);
 assert.equal(freshBefore.status,'uncertain');assert.equal(x.retry.outcome.status,'reconciled');assert.equal(x.retry.outcome.reconciledStatus,'failed');assert.equal(x.retry.outcome.observationOnly,true);
 const saved=clone(x.retry.outcome),writes=x.calls.filter((c:any)=>c.kind==='api');assert.equal(writes.length,1);
 assert.deepEqual(saved.evidence.composeRecovery,x.evidence.composeRecovery);assert.equal(saved.evidence.healthy,false);
 assert.deepEqual(x.calls.filter((c:any)=>c.kind==='recovery_read')[0].o.operationIntent,x.retry.intent);
 assert.equal(x.calls.filter((c:any)=>c.kind==='native_closed').length,1);
 for(const operation of contract.operations)assert.notEqual(releaseIntentError({...x.state.release,manifest_digest:x.state.release.manifestDigest},
  {...clone(x.retry.intent),operation,requestId:randomUUID()},x.state.journal),null);
 assert.throws(()=>nextReleaseOperation(x.state),/release_recovery_diagnosis_required/);
 await assert.rejects(runReleaseStep(x.args),/release_recovery_diagnosis_required/);
 assert.equal(x.calls.filter((c:any)=>c.kind==='api').length,1);assert.deepEqual(x.retry.outcome,saved);noEffects(x);
});
const corruptions:Record<string,(x:any,e:any)=>void>={
 queueIdentity:(x,e)=>{e.composeRecovery.queue.deploymentId='foreign';x.setQueue(e.composeRecovery.queue);},
 queueHead:(x,e)=>{e.composeRecovery.queue.commit='HEAD';x.setQueue(e.composeRecovery.queue);},
 queueCancelled:(x,e)=>{e.composeRecovery.queue.status='cancelled-by-user';x.setQueue(e.composeRecovery.queue);},
 queueMismatch:(_x,e)=>e.composeRecovery.queue.finishedAt='2026-10-04T12:05:02.500Z',
 data:(_x,e)=>e.dataDigest='0'.repeat(64),schema:(_x,e)=>e.schemaDigest='0'.repeat(64),
 candidateContainer:(_x,e)=>e.composeRecovery.services[0].containerId='0'.repeat(64),
 healthy:(_x,e)=>e.healthy=true,sourceClaim:(_x,e)=>e.deployedCommit=e.composeRecovery.requestedCommit,
 activeSession:(_x,e)=>e.composeRecovery.partialRollbackFailure.activeOtherSessions=1,
 lineageUnsavedAbsence:(x,_e)=>x.rollback.outcome.status='uncertain',
 lineageWrongCandidate:(x,_e)=>x.candidate.outcome.evidence.dataDigest='0'.repeat(64),
 lineageExtraEffect:(x,_e)=>x.state.journal.splice(x.state.journal.length-1,0,{id:randomUUID(),operation:'rollback_config',outcome:{status:'succeeded'}})
};
for(const [name,corrupt] of Object.entries(corruptions))test('adapter/broker refuse forged '+name+' without outcome API or replay',async()=>{const x=setup(),e=clone(x.evidence);corrupt(x,e);x.setEvidence(e);
 await assert.rejects(runReleaseStep({...x.args,reconciliationOnly:true}),/release_(?:coolify_)?compose_(?:queue_identity_changed|recovery_unproven)/);
 assert.equal(x.retry.outcome.status,'uncertain');assert.equal(x.calls.filter((c:any)=>c.kind==='api').length,0);noEffects(x);
});
