import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import contract from './lib/agent-host-release-contract.cjs';
import { runReleaseStep, nextReleaseOperation } from './lib/agent-host-release-broker.mjs';
const hash=c=>c.repeat(64),git=c=>c.repeat(40);
function fixture(operation='deploy'){
 const at=new Date().toISOString(),snapshot={requestId:randomUUID(),taskId:randomUUID(),applicationId:randomUUID(),hostId:randomUUID(),
  releaseExecutionId:randomUUID(),releaserAgentId:randomUUID(),releaserCredentialId:randomUUID(),credentialVersion:1,
  reviewId:randomUUID(),materialVersion:hash('e'),commit:git('a'),candidateTree:git('b'),baseCommit:git('c'),baseTree:git('d'),
  releaserRevision:at,expiresAt:new Date(Date.now()+60000).toISOString()};
 const targets=['api','web'].map((targetId,index)=>({targetId,name:targetId,dockerfile:`/apps/${targetId}/Dockerfile`,
  configDigest:hash(String(index+1)),baseline:{commit:git(index?'f':'c'),tree:git(index?'e':'d'),imageDigest:`sha256:${hash('3')}`,configDigest:hash(String(index+1))}}));
 const configDigest=contract.releaseDigest(targets.map(t=>({targetId:t.targetId,configDigest:t.configDigest})));
 const m={schemaVersion:'roost-release-manifest-v2',purpose:'application_release',repository:{url:'https://github.com/example/pilot',defaultBranch:'main',canonicalDir:'C:\\Pilot',candidateBranch:'codex/pilot'},
  deployment:{provider:'coolify_git_set',targetId:'api',url:'https://pilot.example.test',controllerUrl:'https://controller.example.test',publicOrigins:['https://pilot.example.test'],targets,artifactSetDigest:'',configDigest,schemaDigest:hash('4')},
  services:[{name:'api',healthUrl:'https://pilot.example.test/health',expectedStatus:200}],
  baseline:{commit:snapshot.baseCommit,artifactSetDigest:'',configDigest,schemaDigest:hash('4'),healthDigest:hash('5'),dataDigest:hash('6'),observedAt:at},
  rollback:{commit:snapshot.baseCommit,artifactSetDigest:'',configDigest,schemaDigest:hash('4'),compatibleSchemaDigests:[hash('4')]},
  backup:{digest:hash('7'),restoreDigest:hash('7'),bytes:100,capturedAt:at,restoreVerifiedAt:at},observation:{seconds:1,intervalSeconds:1,maxFailures:0},
  cleanup:{repositoryUrl:'https://github.com/example/pilot',canonicalDir:'C:\\Pilot',coolifyTargetId:'api',archiveRepository:false,ownedResourceIds:[],protectedResourceIds:['api','web']}};
 m.deployment.artifactSetDigest=contract.gitSetArtifactDigest(m,snapshot);m.baseline.artifactSetDigest=m.rollback.artifactSetDigest=contract.gitSetArtifactDigest(m,snapshot,true);
 snapshot.manifest=m;snapshot.manifestDigest=contract.releaseDigest(m);
 const done=op=>({id:randomUUID(),operation:op,createdAt:at,intent:{parameters:{}},outcome:{status:'succeeded',evidence:{}}});
 const before=['push','pr','review','merge','deploy_config','deploy'];
 const journal=before.slice(0,before.indexOf(operation)).map(done);
 const state={release:{id:randomUUID(),manifestDigest:snapshot.manifestDigest,snapshot},journal,status:'active',expectedVersion:hash('8')};
 const calls=[],evidence={deployedCommit:snapshot.commit,deployedTree:snapshot.candidateTree,artifactSetDigest:m.deployment.artifactSetDigest,
  configDigest,schemaDigest:hash('4'),dataDigest:hash('6'),healthDigest:hash('5'),healthy:true,
  deployedTargets:targets.map(t=>({targetId:t.targetId,commit:snapshot.commit,tree:snapshot.candidateTree,imageDigest:`sha256:${hash('9')}`,
   configDigest:t.configDigest,schemaDigest:hash('4'),healthy:true,deploymentId:`queue-${t.targetId}`}))};
 evidence.deploymentIds=evidence.deployedTargets.map(row=>({targetId:row.targetId,deploymentId:row.deploymentId}));
 evidence.deployedSetDigest=contract.releaseDigest(evidence.deployedTargets.map(({healthy,deploymentId,...row})=>row));
 const scoped=options=>{
  const value=structuredClone(evidence);
  if(options?.targetId){value.deployedTargets=value.deployedTargets.filter(row=>row.targetId===options.targetId);
   value.deploymentIds=value.deploymentIds.filter(row=>row.targetId===options.targetId);
   value.deployedSetDigest=contract.releaseDigest(value.deployedTargets.map(({healthy,deploymentId,...row})=>row));}
  return value;
 };
 const args={state,client:{hostId:snapshot.hostId,agentId:snapshot.releaserAgentId},assertWriter:async()=>{},inspectCheckout:async()=>{},
  github:{inspect:async()=>({remoteBase:snapshot.commit,remoteTree:snapshot.candidateTree})},resources:{inspectCapacity:async()=>{}},
  api:async(route,{body})=>{
   calls.push({action:'api',route,body});
   if(route.endsWith('/operations')){const op={id:randomUUID(),operation:body.operation,intent:body,createdAt:at,outcome:null};state.journal.push(op);return {...state,operation:op,replayed:false};}
   state.journal.find(op=>route.includes(op.id)).outcome=body;return state;
  },coolify:{
   configureCandidate:async()=>({commit:snapshot.commit,artifactSetDigest:m.deployment.artifactSetDigest,configDigest,schemaDigest:hash('4')}),
   deploy:async(_m,_s,options)=>{calls.push({action:'deploy',options});return {state:'finished',deploymentIds:scoped(options).deploymentIds};},
   waitForDeployment:async(_m,_s,options)=>{calls.push({action:'wait',options});return {state:'finished',deploymentIds:scoped(options).deploymentIds};},
   health:async(_m,_s,options)=>scoped(options),observe:async()=>({...structuredClone(evidence),observationSeconds:1}),
   reconcileDeployment:async(_m,_s,options)=>{calls.push({action:'reconcile',options});return {state:'finished',...scoped(options)};}
  }};
 return {state,snapshot,m,args,calls,evidence};
}
test('source test: durable batch identity reaches dispatch and wait; typed set evidence has no top OCI identity',async()=>{
 const f=fixture();await runReleaseStep(f.args);
 const op=f.state.journal.at(-1),dispatch=f.calls.find(c=>c.action==='deploy'),wait=f.calls.find(c=>c.action==='wait');
 assert.equal(dispatch.options.operationId,op.id);assert.equal(dispatch.options.since,op.createdAt);
 assert.equal(wait.options.operationId,op.id);
 assert.equal(op.intent.parameters.artifactSetDigest,f.m.deployment.artifactSetDigest);
 assert.equal(op.intent.parameters.imageDigest,undefined);assert.equal(op.outcome.evidence.imageDigest,undefined);
 assert.equal(op.outcome.evidence.deploymentId,undefined);assert.equal(op.outcome.evidence.deploymentIds.length,1);
 assert.equal(op.outcome.evidence.deployedTargets.length,1);assert.equal(op.outcome.status,'succeeded');
 assert.equal(op.intent.parameters.targetId,'api');assert.equal(dispatch.options.targetId,'api');
});
test('source test: source configure journals source aggregate before images exist',async()=>{
 const f=fixture('deploy_config');await runReleaseStep(f.args);
 const e=f.state.journal.at(-1).outcome.evidence;
 assert.equal(e.artifactSetDigest,f.m.deployment.artifactSetDigest);assert.equal(e.deployedCommit,f.snapshot.commit);
 assert.equal(e.imageDigest,undefined);assert.equal(e.deployedTargets,undefined);
});

test('diagnosed rollback image failure preserves actual journal and permits only a fresh strict rollback intent',async()=>{
 const f=fixture('deploy'),t=f.m.deployment.targets[0],at=new Date().toISOString(),row={targetId:t.targetId,...t.baseline,imageDigest:`sha256:${hash('9')}`,schemaDigest:f.m.rollback.schemaDigest,healthy:true,deploymentId:'rebuilt-api'};
 const e={observedAt:at,deployedCommit:f.m.rollback.commit,deployedTree:f.snapshot.baseTree,artifactSetDigest:f.m.rollback.artifactSetDigest,configDigest:f.m.rollback.configDigest,schemaDigest:f.m.rollback.schemaDigest,dataDigest:f.m.baseline.dataDigest,healthDigest:hash('5'),healthy:false,failureKind:'rollback_image_mismatch',deployedTargets:[row],deploymentIds:[{targetId:t.targetId,deploymentId:row.deploymentId}],deployedSetDigest:contract.releaseDigest([{...t.baseline,targetId:t.targetId,imageDigest:row.imageDigest,schemaDigest:row.schemaDigest}])};
 f.state.journal.push({id:randomUUID(),operation:'observe',intent:{parameters:{mode:'candidate'}},outcome:{status:'failed',evidence:{healthy:false}}},{id:randomUUID(),operation:'rollback_config',intent:{parameters:{}},outcome:{status:'succeeded',evidence:{}}},{id:randomUUID(),operation:'rollback',createdAt:at,intent:{parameters:{targetId:t.targetId}},outcome:{status:'uncertain',evidence:{}}});
 f.args.coolify.reconcileDeployment=async()=>({state:'failed',...e});
 await runReleaseStep(f.args);
 const failed=f.state.journal.at(-1);assert.equal(failed.outcome.status,'reconciled');assert.equal(failed.outcome.reconciledStatus,'failed');assert.equal(failed.outcome.evidence.failureKind,'rollback_image_mismatch');
 assert.equal(nextReleaseOperation(f.state),'rollback');assert.equal(f.calls.filter(c=>c.action==='deploy').length,0);
 failed.outcome.evidence.deployedTargets[0].imageDigest=t.baseline.imageDigest;
 assert.throws(()=>nextReleaseOperation(f.state),/release_recovery_diagnosis_required/);
});

function successorFixture(){
 const f=fixture('deploy_config'),releaseId=randomUUID(),expectedVersion=hash('a');
 f.state.journal=[];f.snapshot.predecessor={releaseId,expectedVersion};
 f.snapshot.successorBasis={schemaVersion:'roost-release-successor-v1',releaseId,expectedVersion,mergeOperationId:randomUUID(),rollbackObservationOperationId:randomUUID(),cleanupOperationId:randomUUID(),rollbackDeploymentIds:f.m.deployment.targets.map(t=>({targetId:t.targetId,deploymentId:'rollback-'+t.targetId}))};
 f.args.coolify.inspect=async()=>{f.calls.push({action:'actual_baseline_inspection'});};
 for(const op of ['push','pr','review','merge'])f.args.github[op]=async()=>{throw Error('git_mutation_must_not_repeat');};
 return f;
}
function publishedFixture(){
 const f=successorFixture(),{releaseId,expectedVersion}=f.snapshot.predecessor,closureId=randomUUID();
 delete f.snapshot.predecessor;delete f.snapshot.successorBasis;
 f.snapshot.baselineRestart={releaseId,expectedVersion,closureId,consentDigest:hash('c')};
 f.snapshot.publishedGitBasis={schemaVersion:'roost-release-published-git-v1',releaseId,expectedVersion,closureId,closureDigest:hash('d'),
  pushOperationId:randomUUID(),prOperationId:randomUUID(),reviewOperationId:randomUUID(),mergeOperationId:randomUUID(),
  baselineDeploymentIds:f.m.deployment.targets.map(t=>({targetId:t.targetId,deploymentId:'accepted-baseline-'+t.targetId}))};
 return f;
}
test('owner accepted baseline inherits only publication and runs fresh ordinary deployment and observation',async()=>{
 const f=publishedFixture(),parent=f.snapshot.baseCommit;f.m.observation={seconds:1200,intervalSeconds:30,maxFailures:0};f.snapshot.manifestDigest=f.state.release.manifestDigest=contract.releaseDigest(f.m);
 f.args.inspectCheckout=async(_m,commit,base,tree)=>{assert.equal(commit,f.snapshot.commit);assert.equal(base,parent);assert.equal(tree,f.snapshot.candidateTree);};
 f.args.coolify.observe=async(m)=>{assert.deepEqual(m.observation,{seconds:1200,intervalSeconds:30,maxFailures:0});return{...structuredClone(f.evidence),observationSeconds:1200};};
 assert.equal(nextReleaseOperation(f.state),'deploy_config');
 for(let index=0;index<4;index++)await runReleaseStep(f.args);
 assert.deepEqual(f.state.journal.map(row=>row.operation),['deploy_config','deploy','deploy','observe']);
 assert.equal(f.calls.filter(row=>row.action==='actual_baseline_inspection').length,1);
 assert.equal(f.calls.filter(row=>row.action==='deploy').length,2);
 assert.equal(f.state.journal.at(-1).intent.parameters.mode,'candidate');assert.equal(f.state.journal.at(-1).outcome.evidence.observationSeconds,1200);
 assert.equal(f.snapshot.baseCommit,parent);assert.equal(f.snapshot.successorBasis,undefined);
});
test('publication restart refuses forged lineage, old main and missing baseline before any new intent',async()=>{
 for(const change of ['missing','version','closure','coverage','self','mix','old-main']){
  const f=publishedFixture();
  if(change==='missing')delete f.snapshot.publishedGitBasis;
  if(change==='version')f.snapshot.publishedGitBasis.expectedVersion=hash('f');
  if(change==='closure')f.snapshot.publishedGitBasis.closureId=randomUUID();
  if(change==='coverage')f.snapshot.publishedGitBasis.baselineDeploymentIds[0].targetId='foreign';
  if(change==='self')f.snapshot.baselineRestart.releaseId=f.snapshot.publishedGitBasis.releaseId=f.state.release.id;
  if(change==='mix')f.snapshot.successorBasis=successorFixture().snapshot.successorBasis;
  if(change==='old-main')f.args.github.inspect=async()=>({remoteBase:f.snapshot.baseCommit,remoteTree:f.snapshot.baseTree});
  await assert.rejects(runReleaseStep(f.args));assert.equal(f.state.journal.length,0);assert.equal(f.calls.filter(row=>row.action==='deploy').length,0);
 }
});
test('expired uncertain rollback records attributed FAILED read-only and never resumes original image recovery',async()=>{
 const f=fixture(),t=f.m.deployment.targets[0],at=new Date().toISOString();
 f.state.status='expired';f.state.effectiveExpiresAt=new Date(Date.now()-60000).toISOString();
 const row={targetId:t.targetId,...t.baseline,imageDigest:`sha256:${hash('9')}`,schemaDigest:f.m.rollback.schemaDigest,healthy:true,deploymentId:'rebuilt-api'};
 const evidence={observedAt:at,deployedCommit:f.m.rollback.commit,deployedTree:f.snapshot.baseTree,artifactSetDigest:f.m.rollback.artifactSetDigest,configDigest:f.m.rollback.configDigest,schemaDigest:f.m.rollback.schemaDigest,dataDigest:f.m.baseline.dataDigest,healthDigest:hash('5'),healthy:false,failureKind:'rollback_image_mismatch',deployedTargets:[row],deploymentIds:[{targetId:t.targetId,deploymentId:row.deploymentId}],deployedSetDigest:contract.releaseDigest([{...t.baseline,targetId:t.targetId,imageDigest:row.imageDigest,schemaDigest:row.schemaDigest}])};
 f.state.journal.push({id:randomUUID(),operation:'rollback',createdAt:at,intent:{parameters:{targetId:t.targetId}},outcome:{status:'uncertain',evidence:{}}});
 f.args.coolify.reconcileDeployment=async()=>({state:'failed',...evidence});
 await runReleaseStep(f.args);const outcome=f.state.journal.at(-1).outcome;
 assert.equal(outcome.status,'reconciled');assert.equal(outcome.reconciledStatus,'failed');assert.equal(outcome.observationOnly,true);
 assert.equal(contract.releaseRollbackImageFailureValid(f.snapshot,outcome.evidence,t.targetId),true);
 assert.equal(nextReleaseOperation(f.state),null);assert.equal((await runReleaseStep(f.args)).handled,false);
 assert.equal(f.calls.some(row=>row.action==='deploy'||row.route?.endsWith('/operations')),false);
});
test('source test: successor uses exact existing publication and new baseline inspection without fictitious Git operations',async()=>{
 const f=successorFixture();assert.equal(nextReleaseOperation(f.state),'deploy_config');
 await runReleaseStep(f.args);assert.deepEqual(f.state.journal.map(x=>x.operation),['deploy_config']);
 assert.equal(f.calls.filter(x=>x.action==='actual_baseline_inspection').length,1);
 assert.equal(f.state.journal[0].outcome.status,'succeeded');
});
test('source test: successor rejects changed actual main before intent and never substitutes candidate for its parent',async()=>{
 const f=successorFixture();f.args.inspectCheckout=async(_m,commit,parent,tree)=>{assert.equal(parent,f.snapshot.baseCommit);assert.equal(commit,f.snapshot.commit);assert.equal(tree,f.snapshot.candidateTree);};
 f.args.github.inspect=async()=>({remoteBase:f.snapshot.baseCommit,remoteTree:f.snapshot.baseTree});
 await assert.rejects(runReleaseStep(f.args),/release_base_changed/);assert.equal(f.state.journal.length,0);
});
test('source test: client supplied predecessor without server basis and forged or self lineage fail closed',async()=>{
 for(const change of ['missing','version','target','self']){
  const f=successorFixture();
  if(change==='missing')delete f.snapshot.successorBasis;
  if(change==='version')f.snapshot.successorBasis.expectedVersion=hash('b');
  if(change==='target')f.snapshot.successorBasis.rollbackDeploymentIds[0].targetId='outside';
  if(change==='self'){f.snapshot.predecessor.releaseId=f.state.release.id;f.snapshot.successorBasis.releaseId=f.state.release.id;}
  await assert.rejects(runReleaseStep(f.args),/release_successor_binding_changed/);assert.equal(f.state.journal.length,0);
 }
});

test('source test: configuration absence retains actual baseline rows and reconciles without a write',async()=>{
 const f=fixture('deploy_config'),op={id:randomUUID(),operation:'deploy_config',createdAt:new Date().toISOString(),
  intent:{parameters:{}},outcome:{status:'uncertain'}};
 f.state.journal.push(op);f.state.status='reconciliation_required';
 const baseline={...f.evidence,deployedCommit:f.snapshot.baseCommit,deployedTree:f.snapshot.baseTree,
  artifactSetDigest:f.m.baseline.artifactSetDigest,absenceVerified:true,
  deployedTargets:f.m.deployment.targets.map(t=>({...t.baseline,targetId:t.targetId,schemaDigest:f.m.baseline.schemaDigest,
   healthy:true,deploymentId:'baseline-'+t.targetId})),
  deploymentIds:f.m.deployment.targets.map(t=>({targetId:t.targetId,deploymentId:'baseline-'+t.targetId}))};
 let writes=0;f.args.coolify.configureCandidate=async()=>{writes++;throw Error('unexpected_write');};
 f.args.coolify.reconcileConfiguration=async(_m,_s,options)=>{
  assert.equal(options.operationId,op.id);assert.equal(options.since,op.createdAt);
  return{state:'absent',evidence:baseline};
 };
 await runReleaseStep(f.args);
 assert.equal(writes,0);assert.equal(f.state.journal.length,5);
 assert.equal(op.outcome.status,'reconciled');assert.equal(op.outcome.reconciledStatus,'absent');
 assert.deepEqual(op.outcome.evidence.deployedTargets,baseline.deployedTargets);
 assert.equal(op.outcome.evidence.deployedCommit,f.snapshot.baseCommit);
 assert.equal(op.outcome.evidence.artifactSetDigest,f.m.baseline.artifactSetDigest);
 assert.equal(op.outcome.evidence.absenceVerified,true);
});

test('source test: an unsupported or unproven configuration absence cannot settle the pending intent',async()=>{
 for(const result of [{state:'absent',evidence:{}},{state:'uncertain'},undefined]){
  const f=fixture('deploy_config');f.state.journal.push({id:randomUUID(),operation:'deploy_config',
   createdAt:new Date().toISOString(),intent:{parameters:{}},outcome:{status:'uncertain'}});
  f.args.coolify.reconcileConfiguration=async()=>result;
  await assert.rejects(runReleaseStep(f.args),/release_reconciliation_unproven/);
  assert.equal(f.calls.length,0);
 }
});
test('source test: uncertain batch response is journalled once then only reconciles same durable identity',async()=>{
 const f=fixture();let dispatches=0;
 f.args.coolify.deploy=async()=>{dispatches++;return {state:'uncertain',deploymentIds:[]};};
 const first=await runReleaseStep(f.args);assert.equal(first.reconciliationRequired,true);
 const op=f.state.journal.at(-1);assert.equal(op.outcome.status,'uncertain');
 await runReleaseStep(f.args);
 assert.equal(dispatches,1);assert.equal(op.outcome.status,'reconciled');assert.equal(op.outcome.reconciledStatus,'succeeded');
 assert.equal(f.calls.find(c=>c.action==='reconcile').options.operationId,op.id);
});
test('source test: timeout cannot become an attributed release failure or automatic rollback',async()=>{
 const f=fixture();f.args.coolify.waitForDeployment=async()=>({state:'uncertain',reason:'deployment_wait_incomplete'});
 await runReleaseStep(f.args);assert.equal(f.state.journal.at(-1).outcome.status,'uncertain');
 assert.equal(f.state.journal.some(op=>op.operation==='rollback'),false);
});
test('source test: fake top image in a set adapter is uncertain rather than silently stripped',async()=>{
 const f=fixture();f.args.coolify.health=async()=>({...f.evidence,imageDigest:`sha256:${hash('a')}`});
 await runReleaseStep(f.args);assert.equal(f.state.journal.at(-1).outcome.status,'uncertain');
});
test('source test: failed queue with healthy unrelated runtime remains uncertain',async()=>{
 const f=fixture();f.args.coolify.waitForDeployment=async()=>({state:'failed',deploymentIds:f.evidence.deploymentIds});
 await runReleaseStep(f.args);assert.equal(f.state.journal.at(-1).outcome.status,'uncertain');
});
test('source test: observation carries prior exact deployment set and preserves row provenance',async()=>{
 const f=fixture();await runReleaseStep(f.args);await runReleaseStep(f.args);await runReleaseStep(f.args);
 const e=f.state.journal.at(-1).outcome.evidence;
 assert.deepEqual(e.deploymentIds,f.evidence.deploymentIds);assert.equal(e.observationSeconds,1);
 assert.ok(e.deployedTargets.every(row=>row.deploymentId));assert.equal(e.deploymentId,undefined);
});
test('source test: interrupted first target reconciles readonly then second target receives new durable intent',async()=>{
 const f=fixture(),original=f.args.coolify.deploy;let first=true;
 f.args.coolify.deploy=async(...args)=>{const result=await original(...args);if(first){first=false;throw Error('lost reply after actual first target');}return result;};
 await runReleaseStep(f.args);
 const firstIntent=f.state.journal.at(-1);assert.equal(firstIntent.intent.parameters.targetId,'api');assert.equal(firstIntent.outcome.status,'uncertain');
 assert.equal(f.calls.filter(c=>c.action==='deploy').length,1);
 await runReleaseStep(f.args);
 assert.equal(firstIntent.outcome.status,'reconciled');assert.equal(f.calls.filter(c=>c.action==='deploy').length,1);
 assert.equal(f.calls.find(c=>c.action==='reconcile').options.operationId,firstIntent.id);
 await runReleaseStep(f.args);
 const secondIntent=f.state.journal.at(-1);assert.equal(secondIntent.operation,'deploy');assert.equal(secondIntent.intent.parameters.targetId,'web');
 assert.notEqual(secondIntent.id,firstIntent.id);assert.equal(f.calls.filter(c=>c.action==='deploy').length,2);
 assert.equal(f.calls.filter(c=>c.action==='deploy')[1].options.operationId,secondIntent.id);
 assert.equal(secondIntent.outcome.status,'succeeded');
});
