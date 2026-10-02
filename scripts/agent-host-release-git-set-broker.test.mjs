import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import contract from './lib/agent-host-release-contract.cjs';
import { runReleaseStep } from './lib/agent-host-release-broker.mjs';
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
