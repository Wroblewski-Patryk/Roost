import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {require as tsRequire} from 'tsx/cjs/api';
import contract from './lib/agent-host-release-contract.cjs';
import {fixture as contractFixture,hash,image} from './fixtures/release-compose-contract.cjs';
import {nextReleaseOperation,runReleaseStep} from './lib/agent-host-release-broker.mjs';
const {releaseIntentError,releaseOutcomeError}=tsRequire('../src/modules/agent-runtime/governed-release-contract.ts',import.meta.url);

function fixture(start='deploy'){
 const f=contractFixture(),at=new Date().toISOString();
 const s={...f.s,requestId:randomUUID(),taskId:randomUUID(),applicationId:randomUUID(),hostId:randomUUID(),releaseExecutionId:randomUUID(),
  releaserAgentId:randomUUID(),releaserCredentialId:randomUUID(),credentialVersion:1,reviewId:randomUUID(),materialVersion:hash('1'),releaserRevision:at,
  expiresAt:new Date(Date.now()+60000).toISOString(),manifestDigest:contract.releaseDigest(f.m)};
 const state={release:{id:randomUUID(),snapshot:s,manifestDigest:s.manifestDigest,manifest_digest:s.manifestDigest},journal:[],status:'active',expectedVersion:hash('2')};
 const sequence=['push','pr','review','merge','deploy_config','deploy','observe','cleanup'];
 const done=(operation,evidence={})=>({id:randomUUID(),operation,createdAt:at,intent:{parameters:{}},outcome:{status:'succeeded',evidence}});
 for(const op of sequence.slice(0,sequence.indexOf(start)))state.journal.push(done(op,op==='deploy'?f.evidence():{}));
 for(const row of state.journal)if(row.operation==='deploy')row.intent.parameters.targetId='composeapp';
 const calls=[];
 const configurationProof=rollback=>({commit:rollback?f.m.rollback.commit:s.commit,artifactSetDigest:rollback?f.m.rollback.artifactSetDigest:f.m.deployment.artifactSetDigest,
  configDigest:rollback?f.m.rollback.configDigest:f.m.deployment.configDigest,schemaDigest:f.m.deployment.schemaDigest});
 const queues=rollback=>f.evidence(rollback).deploymentIds;
 const gitProof=()=>({remoteCommit:s.commit,remoteTree:s.candidateTree,pullRequestNumber:3,prHeadCommit:s.commit});
 const args={state,client:{hostId:s.hostId,agentId:s.releaserAgentId},assertWriter:async()=>{calls.push('writer');},onChildrenClosed:async()=>{calls.push('closed');},
  inspectCheckout:async()=>({commit:s.commit,tree:s.candidateTree}),
  github:{inspect:async()=>({remoteBase:state.journal.some(row=>row.operation==='merge'&&row.outcome?.status==='succeeded')?s.commit:s.baseCommit,
   remoteTree:state.journal.some(row=>row.operation==='merge'&&row.outcome?.status==='succeeded')?s.candidateTree:s.baseTree}),
   push:async()=>{calls.push('push');return gitProof();},createPullRequest:async()=>{calls.push('pr');return gitProof();},
   recordIndependentReview:async()=>{calls.push('review');return {...gitProof(),reviewApproved:true};},merge:async()=>{calls.push('merge');return {...gitProof(),prMerged:true,mergedCommit:s.commit};}},
  resources:{inspectCapacity:async()=>{calls.push('capacity');},verifyRetention:async()=>({applicationActive:true,targetId:'composeapp',
   protectedResourcesDigest:contract.releaseDigest(f.m.cleanup.protectedResourceIds),absenceVerified:true,resourceIds:f.m.cleanup.ownedResourceIds})},
  coolify:{inspect:async()=>{calls.push('baseline');},configureCandidate:async()=>{calls.push('configure');return configurationProof(false);},
   configureRollback:async()=>{calls.push('rollback_config');return configurationProof(true);},
   deploy:async(_m,_s,options)=>{calls.push({kind:'deploy',options});return {state:'finished',deploymentIds:queues(false)};},
   rollback:async(_m,_s,options)=>{calls.push({kind:'rollback',options});return {state:'finished',deploymentIds:queues(true)};},
   waitForDeployment:async(_m,_s,options)=>{calls.push({kind:'wait',options});return {state:'finished',deploymentIds:queues(options.rollback)};},
   health:async(_m,_s,options)=>f.evidence(options.rollback),observe:async(_m,_s,options)=>{calls.push('observe');return f.evidence(options.rollback);},
   reconcileDeployment:async(_m,_s,options)=>{calls.push({kind:'reconcile',options});return {state:'finished',...f.evidence(options.rollback)};},
   reconcileConfiguration:async()=>{calls.push('reconcile_config');return {state:'applied',...configurationProof(false)};}},
  api:async(route,{body})=>{
   calls.push({kind:'api',route,body});assert.equal(calls.at(-2),'closed');
   if(route.endsWith('/operations')){
    assert.equal(releaseIntentError(state.release,body,state.journal),null);
    const operation={id:randomUUID(),operation:body.operation,intent:body,createdAt:at,outcome:null};state.journal.push(operation);return {...state,operation,replayed:false};
   }
   const operation=state.journal.find(row=>route.includes(row.id));
   assert.equal(releaseOutcomeError(state.release,operation,body,state.journal),null);
   operation.outcome=body;return state;
  }};
 return {...f,s,state,args,calls,done};
}
test('source orchestration covers Git to permanent Compose observation/retention with complete service evidence',async()=>{
 const f=fixture('push');for(let i=0;i<8;i++)await runReleaseStep(f.args);
 assert.deepEqual(f.state.journal.map(row=>row.operation),['push','pr','review','merge','deploy_config','deploy','observe','cleanup']);
 assert.equal(nextReleaseOperation(f.state),null);
 const op=f.state.journal.find(row=>row.operation==='deploy'),e=op.outcome.evidence,dispatch=f.calls.find(row=>row.kind==='deploy');
 assert.equal(dispatch.options.operationId,op.id);assert.equal(dispatch.options.since,op.createdAt);assert.equal(dispatch.options.targetId,'composeapp');
 assert.equal(op.intent.parameters.artifactSetDigest,f.m.deployment.artifactSetDigest);assert.equal(op.intent.parameters.imageDigest,undefined);
 assert.equal(e.imageDigest,undefined);assert.equal(e.deployedTargets,undefined);assert.equal(e.composeTargets[0].runtime.services.length,4);
 assert.equal(e.composeTargets[0].runtime.services.find(row=>row.role==='migration').exitCode,0);
 assert.equal(f.state.journal.at(-1).outcome.evidence.repositoryArchived,false);assert.equal(f.state.journal.at(-1).outcome.evidence.localAbsent,false);
});
test('lost deployment reply preserves uncertain intent and only reconciles exact queue before further effects',async()=>{
 const f=fixture();f.args.coolify.deploy=async()=>{f.calls.push('effect_done_reply_lost');throw Error('release_compose_controller_result_uncertain');};
 const first=await runReleaseStep(f.args);assert.equal(first.reconciliationRequired,true);assert.equal(first.uncertaintyDiagnostic,'release_compose_controller_result_uncertain');
 assert.equal(f.state.journal.at(-1).outcome.status,'uncertain');assert.equal(nextReleaseOperation(f.state),'reconcile');
 await runReleaseStep(f.args);const final=f.state.journal.at(-1).outcome;
 assert.equal(final.status,'reconciled');assert.equal(final.reconciledStatus,'succeeded');assert.equal(final.observationOnly,true);
 assert.equal(f.calls.filter(row=>row==='effect_done_reply_lost').length,1);assert.equal(f.calls.filter(row=>row.kind==='reconcile').length,1);
});
for(const [name,change] of [
 ['missing dispatch queue',f=>{f.args.coolify.deploy=async()=>({state:'finished'});}],
 ['wrong dispatch target',f=>{f.args.coolify.deploy=async()=>({state:'finished',deploymentIds:[{targetId:'other',deploymentId:'candidatequeue'}]});}],
 ['different waited queue',f=>{f.args.coolify.waitForDeployment=async()=>({state:'finished',deploymentIds:[{targetId:'composeapp',deploymentId:'otherqueue'}]});}],
 ['health from another queue',f=>{f.args.coolify.health=async()=>{const e=f.evidence();e.deploymentIds[0].deploymentId='otherqueue';return e;};}],
 ['missing migration service',f=>{f.args.coolify.health=async()=>{const e=f.evidence();e.composeTargets[0].runtime.services.splice(1,1);return e;};}],
 ['single stack image',f=>{f.args.coolify.health=async()=>({...f.evidence(),imageDigest:image('f')});}],
 ['unfinished source queue',f=>{f.args.coolify.health=async()=>{const e=f.evidence();e.composeTargets[0].binding.queue.status='in_progress';return e;};}]
])test(`broker keeps uncertain fact rather than accepting ${name}`,async()=>{
 const f=fixture();change(f);const result=await runReleaseStep(f.args);
 assert.equal(result.reconciliationRequired,true);assert.equal(f.state.journal.at(-1).outcome.status,'uncertain');
 assert.equal(f.state.journal.at(-1).outcome.evidence.composeTargets,undefined);assert.equal(nextReleaseOperation(f.state),'reconcile');
});
test('reconciliation cannot relabel the source queue or dispatch again after mismatched fixed-reader facts',async()=>{
 const f=fixture();f.state.journal.push({...f.done('deploy'),intent:{parameters:{targetId:'composeapp'}},outcome:{status:'uncertain'}});
 f.args.coolify.reconcileDeployment=async()=>({state:'finished',...f.evidence(),deploymentIds:[{targetId:'composeapp',deploymentId:'wrongqueue'}]});
 await assert.rejects(runReleaseStep(f.args),/release_compose_deployment_unproven/);
 assert.equal(f.state.journal.at(-1).outcome.status,'uncertain');assert.equal(f.calls.some(row=>row.kind==='deploy'),false);
});
test('attributed unhealthy candidate moves to distinct sealed rollback config and exact immutable recovery',async()=>{
 const f=fixture();f.args.coolify.health=async(_m,_s,options)=>{const e=f.evidence(options.rollback);if(!options.rollback){e.healthy=false;e.composeTargets[0].runtime.services[0].health='unhealthy';}return e;};
 await runReleaseStep(f.args);assert.equal(f.state.journal.at(-1).outcome.status,'failed');assert.equal(nextReleaseOperation(f.state),'rollback_config');
 await runReleaseStep(f.args);assert.equal(f.state.journal.at(-1).intent.parameters.configDigest,f.m.rollback.configDigest);
 assert.notEqual(f.state.journal.at(-1).intent.parameters.configDigest,f.m.baseline.configDigest);
 await runReleaseStep(f.args);assert.equal(f.state.journal.at(-1).operation,'rollback');assert.equal(f.state.journal.at(-1).outcome.status,'succeeded');
 assert.deepEqual(f.state.journal.at(-1).outcome.evidence.composeTargets[0].binding.images.map(row=>({name:row.name,imageDigest:row.imageDigest})),f.target.baseline.images);
 await runReleaseStep(f.args);assert.equal(f.state.journal.at(-1).intent.parameters.mode,'rollback');assert.equal(f.state.journal.at(-1).outcome.status,'succeeded');
 assert.equal(nextReleaseOperation(f.state),'cleanup');
});
test('failed exact rollback health is retained but requests diagnosis rather than an automatic repeat',async()=>{
 const f=fixture();f.state.journal.push({...f.done('deploy'),outcome:{status:'failed',evidence:f.evidence()}},f.done('rollback_config'));
 f.args.coolify.health=async()=>{const e=f.evidence(true);e.healthy=false;e.composeTargets[0].runtime.services[0].health='unhealthy';return e;};
 await runReleaseStep(f.args);assert.equal(f.state.journal.at(-1).outcome.status,'failed');
 assert.throws(()=>nextReleaseOperation(f.state),/release_recovery_diagnosis_required/);
});
test('sealed owned disposable ID cannot disguise any built rollback image as a deletable resource',async()=>{
 const f=fixture('cleanup'),resourceId='temporary';f.m.cleanup.ownedResourceIds=[resourceId];
 f.s.manifestDigest=f.state.release.manifestDigest=f.state.release.manifest_digest=contract.releaseDigest(f.m);
 f.state.journal.at(-1).intent.parameters.mode='candidate';
 f.args.resources.ownedResource=async()=>({resourceId,temporary:true,kind:'docker_image',id:f.target.baseline.images[1].imageDigest});
 await assert.rejects(runReleaseStep(f.args),/release_cleanup_protected_resource/);
 assert.equal(f.calls.some(row=>row.kind==='api'),false);
});

test('exact failed queue with unchanged healthy baseline closes failure and permits only sealed rollback configuration',async()=>{
 const f=fixture(),binding={...f.s,releaseId:f.state.release.id};let recovery;
 f.args.coolify.deploy=async(_m,_s,o)=>{recovery=f.recoveryEvidence(binding,o);return{state:'failed',deploymentIds:[{targetId:o.targetId,deploymentId:recovery.composeRecovery.deploymentId}]};};
 f.args.coolify.waitForDeployment=async()=>({state:'failed',deploymentIds:[{targetId:f.target.targetId,deploymentId:recovery.composeRecovery.deploymentId}],evidence:recovery});
 f.args.coolify.health=async()=>{throw Error('ordinary finished health must not be called for failed queue');};
 await runReleaseStep(f.args);const operation=f.state.journal.at(-1);
 assert.equal(operation.outcome.status,'failed');assert.equal(operation.outcome.evidence.healthy,true);
 assert.equal(operation.outcome.evidence.deployedCommit,f.s.baseCommit);assert.equal(operation.outcome.evidence.composeTargets,undefined);
 assert.equal(nextReleaseOperation(f.state),'rollback_config');await runReleaseStep(f.args);assert.equal(f.state.journal.at(-1).operation,'rollback_config');
});
for(const kind of ['queue_failed','queue_absent'])test(`uncertain effect reconciles typed ${kind}, without dispatch or invented finished receipt`,async()=>{
 const f=fixture(),operation={...f.done('deploy'),intent:{parameters:{targetId:f.target.targetId}},outcome:{status:'uncertain'}};f.state.journal.push(operation);
 f.args.coolify.reconcileDeployment=async(_m,_s,o)=>({state:kind==='queue_absent'?'absent':'failed',evidence:f.recoveryEvidence({...f.s,releaseId:f.state.release.id},o,kind)});
 f.args.coolify.health=async(_m,_s,o)=>{if(!o.rollback)throw Error('not a new candidate deployment');return f.evidence(true);};
 await runReleaseStep(f.args);assert.equal(operation.outcome.status,'reconciled');assert.equal(operation.outcome.reconciledStatus,'failed');
 assert.equal(operation.outcome.evidence.composeRecovery.queue===null,kind==='queue_absent');assert.equal(operation.outcome.evidence.composeTargets,undefined);
 assert.equal(f.calls.some(r=>r.kind==='deploy'),false);
 assert.equal(nextReleaseOperation(f.state),'rollback_config');
 if(kind==='queue_absent'){
  // A separately submitted absent outcome still cannot authorize a fresh
  // candidate queue. The installed broker uses failed + sealed recovery.
  operation.outcome.reconciledStatus='absent';assert.throws(()=>nextReleaseOperation(f.state),/release_compose_no_effect_diagnosis_required/);
  const input={operation:'deploy',manifestDigest:f.s.manifestDigest,commit:f.s.commit,baseCommit:f.s.baseCommit,
   observed:{commit:f.s.commit,manifestDigest:f.s.manifestDigest},parameters:{}};
  assert.equal(releaseIntentError(f.state.release,input,f.state.journal),'release_compose_no_effect_diagnosis_required');}
 operation.outcome.reconciledStatus='failed';
 for(let i=0;i<4;i++)await runReleaseStep(f.args);
 assert.deepEqual(f.state.journal.slice(-4).map(r=>r.operation),['rollback_config','rollback','observe','cleanup']);
 assert.equal(f.state.journal.at(-2).intent.parameters.mode,'rollback');assert.equal(nextReleaseOperation(f.state),null);
 assert.equal(f.calls.some(r=>r.kind==='deploy'),false);assert.equal(f.calls.filter(r=>r.kind==='rollback').length,1);
});
test('server rejects recovery evidence as success, wrong operation, and non-Compose proof',()=>{
 const f=fixture(),operation={...f.done('deploy'),intent:{parameters:{targetId:f.target.targetId}}},o={operationId:operation.id,since:operation.createdAt};
 const e=f.recoveryEvidence({...f.s,releaseId:f.state.release.id},o);
 assert.equal(releaseOutcomeError(f.state.release,operation,{status:'succeeded',evidence:e}),'release_evidence_scope_invalid');
 assert.equal(releaseOutcomeError(f.state.release,{...operation,operation:'observe'},{status:'failed',evidence:e}),'release_compose_recovery_unproven');
 assert.equal(releaseOutcomeError({...f.state.release,snapshot:{...f.s,manifest:{...f.m,deployment:{...f.m.deployment,provider:'coolify_git_set'}}}},operation,{status:'failed',evidence:e}),'release_evidence_scope_invalid');
});
test('absent rollback queue records FAILED and requires diagnosis without a second recovery dispatch',async()=>{
 const f=fixture(),deploy={...f.done('deploy'),intent:{parameters:{targetId:f.target.targetId}},outcome:{status:'failed',evidence:f.evidence()}},
 operation={...f.done('rollback'),intent:{parameters:{targetId:f.target.targetId}},outcome:{status:'uncertain'}};
 f.state.journal.push(deploy,f.done('rollback_config'),operation);
 f.args.coolify.reconcileDeployment=async(_m,_s,o)=>({state:'absent',evidence:f.recoveryEvidence({...f.s,releaseId:f.state.release.id},o,'queue_absent')});
 await runReleaseStep(f.args);assert.equal(operation.outcome.reconciledStatus,'failed');assert.equal(operation.outcome.evidence.composeRecovery.phase,'rollback');
 assert.throws(()=>nextReleaseOperation(f.state),/release_recovery_diagnosis_required/);assert.equal(f.calls.some(r=>r.kind==='deploy'||r.kind==='rollback'),false);
});
