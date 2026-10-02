import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile, realpath } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { require as tsRequire } from 'tsx/cjs/api';
import contract from './lib/agent-host-release-contract.cjs';
import { nextReleaseOperation, runReleaseStep } from './lib/agent-host-release-broker.mjs';
import { inspectReleaseCheckout } from './lib/agent-host-release-github.mjs';
const { releaseIntentError, releaseOutcomeError, releasePurposeMatches }=tsRequire('../src/modules/agent-runtime/governed-release-contract.ts',import.meta.url);

const commit='a'.repeat(40),base='b'.repeat(40),tree='c'.repeat(40),baseTree='d'.repeat(40),hash='e'.repeat(64),at='2026-10-01T12:00:00.000Z';
function fixture(retained=true){
 const artifact={commit:base,imageDigest:`sha256:${'1'.repeat(64)}`,configDigest:hash,schemaDigest:hash};
 const manifest={schemaVersion:'roost-release-manifest-v1',repository:{url:'https://github.com/example/certification',defaultBranch:'main',canonicalDir:'C:\\Certification\\one',candidateBranch:'codex/release'},deployment:{provider:'coolify',targetId:'fixture-target',controllerUrl:'https://controller.example.test',url:'https://certification.example.test',imageDigest:`sha256:${'2'.repeat(64)}`,configDigest:hash,schemaDigest:hash},services:[{name:'api',healthUrl:'https://certification.example.test/health',expectedStatus:200}],baseline:{...artifact,healthDigest:hash,dataDigest:hash,observedAt:at},observation:{seconds:30,intervalSeconds:5,maxFailures:0},backup:{digest:hash,bytes:123,capturedAt:at,restoreVerifiedAt:at,restoreDigest:hash},rollback:{...artifact,compatibleSchemaDigests:[hash]},cleanup:{repositoryUrl:'https://github.com/example/certification',canonicalDir:'C:\\Certification\\one',coolifyTargetId:'fixture-target',ownedResourceIds:['disposable-build'],archiveRepository:true}};
 if(retained){manifest.schemaVersion='roost-release-manifest-v2';manifest.purpose='application_release';manifest.cleanup.archiveRepository=false;manifest.cleanup.protectedResourceIds=['fixture-target','persistent-data',manifest.baseline.imageDigest,manifest.deployment.imageDigest];}
 const snapshot={requestId:randomUUID(),taskId:randomUUID(),applicationId:randomUUID(),hostId:randomUUID(),releaseExecutionId:randomUUID(),releaserAgentId:randomUUID(),releaserCredentialId:randomUUID(),credentialVersion:1,reviewId:randomUUID(),materialVersion:hash,commit,candidateTree:tree,baseCommit:base,baseTree,releaserRevision:at,expiresAt:new Date(Date.now()+60000).toISOString(),manifest,manifestDigest:contract.releaseDigest(manifest)};
 const journal=['push','pr','review','merge','deploy_config','deploy','observe','cleanup_resource'].map(operation=>({id:randomUUID(),operation,intent:{parameters:operation==='observe'?{mode:'candidate'}:operation==='cleanup_resource'?{resourceId:'disposable-build'}:{}},outcome:{status:'succeeded'}}));
 return {release:{id:randomUUID(),manifestDigest:snapshot.manifestDigest,manifest_digest:snapshot.manifestDigest,snapshot},journal,status:'active',expectedVersion:hash};
}
function intent(state,operation,parameters={}){const s=state.release.snapshot;return {operation,manifestDigest:s.manifestDigest,commit,baseCommit:base,observed:{commit,baseCommit:commit,baseTree:tree,manifestDigest:s.manifestDigest},parameters};}
function retentionProof(state){const m=state.release.snapshot.manifest;return {retentionVerified:true,repositoryArchived:false,localAbsent:false,repositoryUrl:m.repository.url,canonicalDir:m.repository.canonicalDir,targetId:m.deployment.targetId,applicationActive:true,localCommit:commit,localTree:tree,remoteCommit:commit,remoteTree:tree,protectedResourcesDigest:contract.releaseDigest(m.cleanup.protectedResourceIds),absenceVerified:true,resourceIds:m.cleanup.ownedResourceIds};}
function harness(state){
 const calls=[];const s=state.release.snapshot;
 const args={state,client:{hostId:s.hostId,agentId:s.releaserAgentId},assertWriter:async()=>{},inspectCheckout:async()=>{calls.push('checkout');return {commit,tree,baseCommit:base};},github:{inspect:async(_m,options)=>{assert.equal(options.allowArchived,false);calls.push('remote');return {remoteBase:commit,remoteTree:tree};},archive:async()=>{throw Error('forbidden archive');},verifyArchive:async()=>{throw Error('forbidden archive readback');}},resources:{verifyRetention:async()=>{calls.push('retention');return retentionProof(state);},cleanupLocal:async()=>{throw Error('forbidden clone removal');},verifyCleanup:async()=>{throw Error('forbidden absence proof');},ownedResource:async()=>({resourceId:'disposable-build',kind:'container',id:'temporary-container',temporary:true})},coolify:{},api:async(route,{body})=>{
  calls.push('api');if(route.endsWith('/operations')){const operation={id:randomUUID(),operation:body.operation,intent:body,createdAt:new Date().toISOString(),outcome:null};state.journal.push(operation);return {...state,operation,replayed:false};}
  state.journal.find(j=>route.includes(j.id)).outcome=body;return state;
 }};return {args,calls};
}
test('v1 manifest round trip has no inserted purpose or retention fields and retains certification cleanup',()=>{
 const state=fixture(false),m=state.release.snapshot.manifest;
 assert.deepEqual(contract.manifestSchema.parse(m),m);
 // Captured from the original v1 validator at completed Gate 3 (3302d217).
 assert.equal(contract.releaseDigest(contract.manifestSchema.parse(m)),'55d00bd0eb3ba1bf7a280ce3e8aa02b7a214217fc2beccf8784d3bc59c1f5b41');
 assert.equal(contract.releaseDigest(contract.manifestSchema.parse(m)),contract.releaseDigest(m));
 assert.equal('purpose' in contract.manifestSchema.parse(m),false);
 assert.equal(nextReleaseOperation(state),'archive_repository');
 assert.equal(releasePurposeMatches({releasePurpose:'temporary_certification'},m),true);
 assert.equal(releasePurposeMatches({releasePurpose:'application_release'},m),false);
});
test('permanent application policy is explicit and rejects protected resources and malformed purpose',()=>{
 const m=fixture().release.snapshot.manifest;assert.ok(contract.manifestSchema.safeParse(m).success);
 for(const changed of [{purpose:'temporary_certification'},{cleanup:{...m.cleanup,archiveRepository:true}},{cleanup:{...m.cleanup,protectedResourceIds:[]}},{cleanup:{...m.cleanup,protectedResourceIds:['another-target']}},{cleanup:{...m.cleanup,ownedResourceIds:['fixture-target']}},{cleanup:{...m.cleanup,protectedResourceIds:['fixture-target','fixture-target']}}])assert.equal(contract.manifestSchema.safeParse({...m,...changed}).success,false);
 assert.equal(releasePurposeMatches({releasePurpose:'application_release'},m),true);
 assert.equal(releasePurposeMatches({releasePurpose:'temporary_certification'},m),false);
});
test('server refuses both destructive operations even if caller supplies otherwise valid progression',()=>{
 const state=fixture();for(const op of ['archive_repository','cleanup_local']){
  assert.equal(releaseIntentError(state.release,intent(state,op),state.journal),'release_retention_policy_violation');
  for(const status of ['succeeded','uncertain','failed'])assert.equal(releaseOutcomeError(state.release,{operation:op},{status,evidence:{}}),'release_retention_policy_violation');
 }
 assert.equal(releaseIntentError(state.release,intent(state,'cleanup',{resourceIds:['disposable-build']}),state.journal),null);
 const noObserve=state.journal.filter(j=>j.operation!=='observe');assert.equal(releaseIntentError(state.release,intent(state,'cleanup',{resourceIds:['disposable-build']}),noObserve),'release_cleanup_before_verification');
 const resourcesPending=state.journal.filter(j=>j.operation!=='cleanup_resource');assert.equal(releaseIntentError(state.release,intent(state,'cleanup',{resourceIds:['disposable-build']}),resourcesPending),'release_cleanup_resources_pending');
});
test('server completes only with read-only exact retention proof and disposable absence',()=>{
 const state=fixture(),good={status:'succeeded',observationOnly:true,evidence:retentionProof(state)};
 assert.equal(releaseOutcomeError(state.release,{operation:'cleanup'},good),null);
 for(const fields of [{retentionVerified:false},{applicationActive:false},{repositoryArchived:true},{localAbsent:true},{remoteCommit:base},{localTree:baseTree},{protectedResourcesDigest:hash},{canonicalDir:'C:\\Other'},{repositoryUrl:'https://github.com/example/other'},{targetId:'other'},{resourceIds:[]},{absenceVerified:false}])assert.notEqual(releaseOutcomeError(state.release,{operation:'cleanup'},{...good,evidence:{...good.evidence,...fields}}),null);
 assert.equal(releaseOutcomeError(state.release,{operation:'cleanup'},{...good,observationOnly:false}),'release_retention_unproven');
 assert.equal(releaseOutcomeError(state.release,{operation:'cleanup'},{...good,evidence:{repositoryArchived:true,localAbsent:true,absenceVerified:true,resourceIds:['disposable-build']}}),'release_retention_policy_violation');
});
test('broker persists actual checkout, remote and active target proof and never archives or deletes clone',async()=>{
 const state=fixture(),h=harness(state);assert.equal(nextReleaseOperation(state),'cleanup');await runReleaseStep(h.args);
 const result=state.journal.at(-1).outcome;assert.equal(result.status,'succeeded');assert.equal(result.observationOnly,true);assert.deepEqual(result.evidence,{...retentionProof(state),observedAt:result.evidence.observedAt});
 assert.ok(h.calls.includes('checkout')&&h.calls.includes('remote')&&h.calls.includes('retention'));
 assert.equal(nextReleaseOperation(state),null);
});
test('uncertain retained cleanup performs only fresh read-back before recording durable completion',async()=>{
 const state=fixture();state.journal.push({id:randomUUID(),operation:'cleanup',intent:{parameters:{resourceIds:['disposable-build']}},outcome:{status:'uncertain'}});
 const h=harness(state);await runReleaseStep(h.args);assert.equal(state.journal.at(-1).outcome.status,'reconciled');assert.equal(state.journal.at(-1).outcome.reconciledStatus,'succeeded');assert.equal(h.calls.filter(c=>c==='api').length,1);
});
test('forbidden pending destructive cleanup cannot be reconciled as a fake success',async()=>{
 for(const operation of ['archive_repository','cleanup_local']){const state=fixture();state.journal.push({id:randomUUID(),operation,intent:{parameters:{}},outcome:{status:'uncertain'}});const h=harness(state);await assert.rejects(runReleaseStep(h.args),/retention_policy_violation/);assert.deepEqual(h.calls,[]);}
});
test('cleanup descriptor cannot disguise active app, persistent data or release/rollback image as disposable',async()=>{
 const rows=[{kind:'coolify_application',id:'fixture-target'},{kind:'volume',id:'persistent-data'},{kind:'docker_image',id:'foreign',imageDigest:`sha256:${'1'.repeat(64)}`},{kind:'ghcr_version',id:'foreign',publicationDigest:`sha256:${'2'.repeat(64)}`}];
 for(const row of rows){const state=fixture();state.journal=state.journal.filter(j=>j.operation!=='cleanup_resource');const h=harness(state);h.args.resources.ownedResource=async()=>({resourceId:'disposable-build',temporary:true,...row});await assert.rejects(runReleaseStep(h.args),/cleanup_protected_resource/);assert.equal(h.calls.includes('api'),false);}
});
test('missing or wrong retention gateway fails closed instead of producing absence/archive evidence',async()=>{
 for(const gateway of [undefined,async()=>({...retentionProof(fixture()),applicationActive:false})]){const state=fixture(),h=harness(state);h.args.resources.verifyRetention=gateway;const result=await runReleaseStep(h.args);assert.equal(result.reconciliationRequired,true);assert.equal(state.journal.at(-1).outcome.status,'uncertain');assert.deepEqual(state.journal.at(-1).outcome.evidence,{observedAt:state.journal.at(-1).outcome.evidence.observedAt});}
});
test('retained rollback still requires its own healthy observation before preservation cleanup',()=>{
 const state=fixture();state.journal=state.journal.filter(j=>j.operation!=='observe'&&j.operation!=='cleanup_resource');
 state.journal.find(j=>j.operation==='deploy').outcome={status:'failed'};
 assert.equal(nextReleaseOperation(state),'rollback_config');
 state.journal.push({operation:'rollback_config',outcome:{status:'succeeded'}});assert.equal(nextReleaseOperation(state),'rollback');
 state.journal.push({operation:'rollback',outcome:{status:'succeeded'}});assert.equal(nextReleaseOperation(state),'observe');
 state.journal.push({operation:'observe',intent:{parameters:{mode:'rollback'}},outcome:{status:'succeeded'}});assert.equal(nextReleaseOperation(state),'cleanup_resource');
 state.journal.push({operation:'cleanup_resource',intent:{parameters:{resourceId:'disposable-build'}},outcome:{status:'succeeded'}});assert.equal(nextReleaseOperation(state),'cleanup');
});
test('real canonical Git checkout remains intact after permanent release completion', {skip:process.platform!=='win32'}, async()=>{
 const temporary=await mkdtemp(path.join(os.tmpdir(),'roost-release-retention-'));
 const directory=await realpath(temporary);
 const git=args=>execFileSync('git',['-c','core.hooksPath=NUL','-C',directory,...args],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','ignore']}).trim();
 try{
  git(['init','--initial-branch=main']);git(['config','user.email','fixture@example.test']);git(['config','user.name','Release Fixture']);
  await writeFile(path.join(directory,'version.txt'),'baseline\n');git(['add','version.txt']);git(['commit','-m','baseline']);const actualBase=git(['rev-parse','HEAD']);
  git(['checkout','-b','codex/release']);await writeFile(path.join(directory,'version.txt'),'candidate\n');git(['add','version.txt']);git(['commit','-m','candidate']);
  const actualCommit=git(['rev-parse','HEAD']),actualTree=git(['rev-parse','HEAD^{tree}']);
  git(['remote','add','origin','https://github.com/example/certification']);
  const state=fixture(),s=state.release.snapshot,m=s.manifest;
  m.repository.canonicalDir=directory;m.cleanup.canonicalDir=directory;m.baseline.commit=actualBase;m.rollback.commit=actualBase;s.commit=actualCommit;s.baseCommit=actualBase;s.candidateTree=actualTree;
  s.manifestDigest=contract.releaseDigest(m);state.release.manifestDigest=s.manifestDigest;state.release.manifest_digest=s.manifestDigest;
  const h=harness(state);h.args.inspectCheckout=inspectReleaseCheckout;
  h.args.github.inspect=async()=>({remoteBase:actualCommit,remoteTree:actualTree});
  await runReleaseStep(h.args);
  assert.equal(state.journal.at(-1).outcome.status,'succeeded');assert.equal(git(['rev-parse','HEAD']),actualCommit);assert.equal(git(['status','--porcelain']),'');
  assert.equal(state.journal.at(-1).outcome.evidence.canonicalDir,directory);
  await writeFile(path.join(directory,'version.txt'),'unexpected change\n');
  state.journal.at(-1).outcome={status:'uncertain'};
  await assert.rejects(runReleaseStep(h.args),/release_git_checkout_changed/);
 }finally{
  assert.equal(path.dirname(path.resolve(directory)),path.resolve(os.tmpdir()));assert.ok(path.basename(directory).startsWith('roost-release-retention-'));
  await rm(directory,{recursive:true,force:true});
 }
});
