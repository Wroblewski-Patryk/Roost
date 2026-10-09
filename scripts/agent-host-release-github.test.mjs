import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync,realpathSync} from 'node:fs';
import path from 'node:path';import os from 'node:os';
import { createGithubReleaseAdapter,inspectReleaseCheckout } from './lib/agent-host-release-github.mjs';

const commit='a'.repeat(40), base='b'.repeat(40), tree='c'.repeat(40);
const manifest={repository:{url:'https://github.com/example/certificate',defaultBranch:'main',candidateBranch:'codex/certificate',canonicalDir:'C:\\test\\certificate'}};
const binding={commit,baseCommit:base,candidateTree:tree,reviewId:'independent-decision',materialVersion:'d'.repeat(64)};
const repo={private:true,archived:false,default_branch:'main',full_name:'example/certificate'};
const pr={number:1,head:{sha:commit,ref:'codex/certificate',repo:{full_name:'example/certificate'}},base:{ref:'main'},state:'open',merged:false};
const publication='4'.repeat(40),publicationTree='5'.repeat(40);
const publicationManifest={...manifest,schemaVersion:'roost-release-manifest-v2',purpose:'application_release',cleanup:{archiveRepository:false},deployment:{provider:'coolify_compose'}};
const publicationBinding={...binding,gitPublicationBase:{commit:publication,tree:publicationTree}};
function publicationHarness({main=publication,mainTree=publicationTree,head=publication,parents=[{sha:publication}],historyMerged=true,historyCommit=publication,losePush=false,loseMerge=false}={}){
 const calls=[];let currentHead=head,currentMain=main,currentTree=mainTree,nextPr=null,uploads=0;
 const history={...structuredClone(pr),number:2,state:'closed',merged:historyMerged,merge_commit_sha:historyCommit,head:{...pr.head,sha:publication}};
 const transport=async r=>{calls.push(r);
  if(r.method==='PATCH'){assert.deepEqual(r.body,{sha:commit,force:false});currentMain=commit;currentTree=tree;if(nextPr){nextPr.state='closed';nextPr.merged=true;nextPr.merge_commit_sha=commit;}if(loseMerge)throw Error('lost');return{status:200,body:{}};}
  if(r.method==='POST'&&r.route.endsWith('/pulls')){nextPr={...structuredClone(pr),number:3};return{status:201,body:nextPr};}
  if(r.method==='POST'&&r.route.endsWith('/reviews'))return{status:200,body:{}};
  if(r.route.endsWith('/git/ref/heads/main'))return{status:200,body:{object:{sha:currentMain}}};
  if(r.route.endsWith('/git/ref/heads/codex/certificate'))return currentHead?{status:200,body:{object:{sha:currentHead}}}:{status:404,body:{}};
  if(r.route.endsWith('/git/commits/'+publication))return{status:200,body:{tree:{sha:currentTree===tree?publicationTree:currentTree},parents:[]}};
  if(r.route.endsWith('/git/commits/'+commit))return{status:200,body:{tree:{sha:tree},parents}};
  if(r.route.includes('/pulls?'))return{status:200,body:[history,...(nextPr?[nextPr]:[])]};
  if(r.route.endsWith('/pulls/2'))return{status:200,body:history};
  if(r.route.endsWith('/pulls/3'))return{status:200,body:nextPr};
  return{status:200,body:{...repo,private:false}};
 };
 const adapter=createGithubReleaseAdapter({credential:async()=>'synthetic-credential',transport,upload:async()=>{uploads++;currentHead=commit;if(losePush)throw Error('lost');}});
 return{adapter,calls,get uploads(){return uploads;}};
}
test('new publication base allows exact branch fast-forward, new PR3 and independent review/merge without inheriting merged PR2',async()=>{
 const h=publicationHarness();const pushed=await h.adapter.push(publicationManifest,publicationBinding);assert.equal(h.uploads,1);assert.equal(pushed.remoteBase,publication);assert.equal(pushed.remoteBaseTree,publicationTree);
 const created=await h.adapter.createPullRequest(publicationManifest,publicationBinding);assert.equal(created.pullRequestNumber,3);assert.equal(created.prMerged,false);
 const reviewed=await h.adapter.recordIndependentReview(publicationManifest,publicationBinding,3);assert.equal(reviewed.reviewApproved,true);assert.equal(reviewed.remoteBaseTree,publicationTree);
 const merged=await h.adapter.merge(publicationManifest,publicationBinding,3);assert.equal(merged.remoteCommit,commit);assert.equal(merged.remoteTree,tree);assert.equal(merged.remoteBase,publication);assert.equal(merged.remoteBaseTree,publicationTree);assert.equal(merged.pullRequestNumber,3);
 assert.equal(h.calls.filter(c=>c.method==='POST'&&c.route.endsWith('/pulls')).length,1);assert.equal(h.calls.filter(c=>c.method==='PATCH').length,1);assert.equal(publicationBinding.baseCommit,base);
});
test('publication refuses changed main/tree, unrelated branch and mixed scope before any mutation',async()=>{
 for(const options of [{main:'6'.repeat(40)},{mainTree:'6'.repeat(40)},{head:'6'.repeat(40)}]){const h=publicationHarness(options);await assert.rejects(h.adapter.push(publicationManifest,publicationBinding));assert.equal(h.uploads,0);assert(h.calls.every(c=>c.method==='GET'));}
 const h=publicationHarness();await assert.rejects(h.adapter.push(publicationManifest,{...publicationBinding,baselineRestart:{}}),/scope_invalid/);assert.equal(h.calls.length,0);
 await assert.rejects(publicationHarness().adapter.push(manifest,publicationBinding),/scope_invalid/);
});
test('only authenticated merged predecessor can be ignored as history; wrong ancestry refuses publication',async()=>{
 for(const options of [{head:commit,historyMerged:false},{head:commit,historyCommit:'6'.repeat(40)}]){const h=publicationHarness(options);await assert.rejects(h.adapter.createPullRequest(publicationManifest,publicationBinding));assert(h.calls.every(c=>c.method==='GET'));}
 const h=publicationHarness({head:commit,parents:[]});await assert.rejects(h.adapter.createPullRequest(publicationManifest,publicationBinding),/exact_fastforward_required/);assert(h.calls.every(c=>c.method==='GET'));
});
test('lost publication push is recognized readonly before any retry and unchanged old branch is proven absent',async()=>{
 const h=publicationHarness({losePush:true});await assert.rejects(h.adapter.push(publicationManifest,publicationBinding),e=>e.uncertain===true);const outcome=await h.adapter.reconcile(publicationManifest,publicationBinding,'push');assert.equal(outcome.status,'succeeded');assert.equal(outcome.evidence.remoteBaseTree,publicationTree);assert.equal(h.uploads,1);
 const absent=publicationHarness();const r=await absent.adapter.reconcile(publicationManifest,publicationBinding,'push');assert.equal(r.status,'absent');assert.equal(r.evidence.remoteCommit,publication);assert.equal(r.evidence.remoteTree,publicationTree);assert.equal(absent.uploads,0);
});
test('lost publication merge reconciles exact candidate/main/PR and original publication tree readonly',async()=>{
 const h=publicationHarness({loseMerge:true,head:commit});await h.adapter.createPullRequest(publicationManifest,publicationBinding);await assert.rejects(h.adapter.merge(publicationManifest,publicationBinding,3),e=>e.uncertain===true);const writes=h.calls.filter(c=>c.method!=='GET').length,r=await h.adapter.reconcile(publicationManifest,publicationBinding,'merge',3);assert.equal(r.status,'succeeded');assert.equal(r.evidence.mergedCommit,commit);assert.equal(r.evidence.remoteBaseTree,publicationTree);assert.equal(h.calls.filter(c=>c.method!=='GET').length,writes);
});
function harness({main=base,head=commit,privateRepo=true,commitParents=[{sha:base}],candidateTree=tree,ancestry,mutation=async()=>({status:200,body:{}})}={}) {
 const calls=[];
 const transport=async r=>{calls.push(r); if(r.method!=='GET')return mutation(r);
  if(r.route.endsWith('/git/ref/heads/main'))return{status:200,body:{object:{sha:main}}};
  if(r.route.endsWith('/git/ref/heads/codex/certificate'))return head?{status:200,body:{object:{sha:head}}}:{status:404,body:{}};
  if(r.route.endsWith(`/git/commits/${commit}`))return{status:200,body:{tree:{sha:candidateTree},parents:commitParents}};
  if(r.route.includes('/compare/'))return{status:200,body:ancestry};
  if(/\/git\/commits\/[a-f0-9]{40}$/.test(r.route))return{status:200,body:{tree:{sha:'d'.repeat(40)},parents:[]}};
  if(r.route.endsWith('/pulls/1'))return{status:200,body:pr};
  return{status:200,body:{...repo,private:privateRepo}};
 };
 return{calls,adapter:createGithubReleaseAdapter({credential:async()=>'test-credential',transport,upload:async()=>{}})};
}
test('broker refuses public target without changing visibility',async()=>{
 const {adapter,calls}=harness({privateRepo:false}); await assert.rejects(adapter.push(manifest,binding),/repository_changed/);
 assert.ok(calls.every(c=>c.method==='GET'));
});
test('retained application accepts existing public visibility using only reads',async()=>{
 const {adapter,calls}=harness({privateRepo:false});
 const retained={...manifest,schemaVersion:'roost-release-manifest-v2',purpose:'application_release',cleanup:{archiveRepository:false}};
 assert.deepEqual(await adapter.inspect(retained),{remoteBase:base,remoteTree:'d'.repeat(40)});
 assert.equal(calls.length,3);assert.ok(calls.every(c=>c.method==='GET'));
 for(const changed of [
  {...retained,purpose:'release_certification'},
  {...retained,cleanup:{archiveRepository:true}},
  {...retained,schemaVersion:'roost-release-manifest-v1'},
 ])await assert.rejects(harness({privateRepo:false}).adapter.inspect(changed),/repository_changed/);
});
test('retained application requires proven boolean visibility and still refuses archived target',async()=>{
 const retained={...manifest,schemaVersion:'roost-release-manifest-v2',purpose:'application_release',cleanup:{archiveRepository:false}};
 for(const visibility of [undefined,null,'false',0]){
  const adapter=createGithubReleaseAdapter({credential:async()=>'test-credential',transport:async()=>({status:200,body:{...repo,private:visibility}})});
  await assert.rejects(adapter.inspect(retained),/repository_changed/);
 }
 const calls=[];const adapter=createGithubReleaseAdapter({credential:async()=>'test-credential',transport:async r=>{calls.push(r);return{status:200,body:{...repo,private:false,archived:true}};}});
 await assert.rejects(adapter.inspect(retained),/repository_changed/);assert.ok(calls.every(c=>c.method==='GET'));
});
test('changed main refuses approved candidate before merge effect',async()=>{
 const {adapter,calls}=harness({main:'e'.repeat(40)}); await assert.rejects(adapter.merge(manifest,binding,1),/base_changed/);
 assert.ok(calls.every(c=>c.method==='GET'));
});
test('uncertain merge invokes effect once and never retries',async()=>{
 const {adapter,calls}=harness({mutation:async()=>{throw Error('lost response including sensitive remote data');}});
 await assert.rejects(adapter.merge(manifest,binding,1),e=>e.uncertain===true && !e.message.includes('sensitive'));
 const writes=calls.filter(c=>c.method!=='GET'); assert.equal(writes.length,1);
 assert.deepEqual(writes[0].body,{sha:commit,force:false});
});
test('only exact remote candidate reconciles a lost push response',async()=>{
 const {adapter,calls}=harness(); const result=await adapter.reconcile(manifest,binding,'push');
 assert.equal(result.status,'succeeded'); assert.equal(result.evidence.remoteCommit,commit);
 assert.ok(calls.every(c=>c.method==='GET'));
 await assert.rejects(harness({head:'f'.repeat(40)}).adapter.reconcile(manifest,binding,'push'),/remote_changed/);
});
test('only proven absent branch permits later push retry',async()=>{
 const {adapter}=harness({head:null});const r=await adapter.reconcile(manifest,binding,'push');
 assert.equal(r.status,'absent');assert.equal(r.evidence.absenceVerified,true);
 await assert.rejects(harness({head:null,main:'f'.repeat(40)}).adapter.reconcile(manifest,binding,'push'),/base_changed/);
});
test('no candidate operation may target main or an injected Git ref',async()=>{
 for(const branch of ['main','codex/../main','codex/x.lock','codex/x@{1}','codex/x?token']){
  const {adapter,calls}=harness();await assert.rejects(adapter.inspect({...manifest,repository:{...manifest.repository,candidateBranch:branch}}));assert.equal(calls.length,0);
 }
});

function comparison(){return{status:'ahead',base_commit:{sha:base},merge_base_commit:{sha:base},total_commits:3,ahead_by:3,behind_by:0,commits:[{sha:'1'.repeat(40)},{sha:'2'.repeat(40)},{sha:commit}]};}
test('remote exact accepted series proves bounded ancestry before reconciliation without any writes',async()=>{const {adapter,calls}=harness({commitParents:[{sha:'2'.repeat(40)}],ancestry:comparison()});const r=await adapter.reconcile(manifest,binding,'push');assert.equal(r.status,'succeeded');assert.equal(r.evidence.remoteCommit,commit);assert.equal(r.evidence.remoteTree,tree);assert.ok(calls.every(c=>c.method==='GET'));assert.equal(calls.filter(c=>c.route.includes('/compare/')).length,1);assert.ok(calls.some(c=>c.route.endsWith('per_page=100')));});
for(const[n,m]of Object.entries({changedBase:p=>p.base_commit.sha='e'.repeat(40),unrelatedBase:p=>p.merge_base_commit.sha='e'.repeat(40),diverged:p=>p.status='diverged',behind:p=>p.behind_by=1,changedHead:p=>p.commits.at(-1).sha='e'.repeat(40),truncated:p=>p.commits.pop(),duplicate:p=>p.commits[1].sha=p.commits[0].sha,unbounded:p=>{p.total_commits=101;p.ahead_by=101;},countMismatch:p=>p.ahead_by=2,invalidSha:p=>p.commits[0].sha='untrusted'}))test('remote series refuses '+n,async()=>{const p=comparison();m(p);const {adapter,calls}=harness({commitParents:[{sha:'2'.repeat(40)}],ancestry:p});await assert.rejects(adapter.merge(manifest,binding,1),/exact_fastforward_required/);assert.ok(calls.every(c=>c.method==='GET'));});
test('remote accepted tree must remain exact even with qualifying ancestry',async()=>{const {adapter,calls}=harness({commitParents:[{sha:'2'.repeat(40)}],ancestry:comparison(),candidateTree:'e'.repeat(40)});await assert.rejects(adapter.merge(manifest,binding,1),/exact_fastforward_required/);assert.ok(calls.every(c=>c.method==='GET'));});
function actualCheckout(){const directory=realpathSync.native(mkdtempSync(path.join(os.tmpdir(),'roost-release-series-test-'))),env={...process.env,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':os.devNull},git=(...a)=>execFileSync('git',['--no-replace-objects','-c','core.hooksPath='+ (process.platform==='win32'?'NUL':os.devNull),'-C',directory,...a],{env,encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','ignore']}).trim();git('init','--initial-branch=main');git('config','user.name','Synthetic Release');git('config','user.email','fixture@example.test');writeFileSync(path.join(directory,'version.txt'),'baseline');git('add','version.txt');git('commit','-m','baseline');const baseCommit=git('rev-parse','HEAD');git('switch','-c',manifest.repository.candidateBranch);for(const name of['accepted repair','accepted correction']){writeFileSync(path.join(directory,'version.txt'),name);git('add','version.txt');git('commit','-m',name);}git('remote','add','origin',manifest.repository.url);return{directory,git,baseCommit,commit:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),manifest:{repository:{...manifest.repository,canonicalDir:directory}}};}
function cleanupCheckout(x){assert.equal(path.dirname(path.resolve(x.directory)),path.resolve(os.tmpdir()));assert.ok(path.basename(x.directory).startsWith('roost-release-series-test-'));rmSync(x.directory,{recursive:true,force:true});}
test('real multi-commit accepted checkout qualifies base ancestor and refuses changed checkout/tree/origin/unrelated base',async()=>{const x=actualCheckout(),inspect=(commit=x.commit,base=x.baseCommit,tree=x.tree)=>inspectReleaseCheckout(x.manifest,commit,base,tree);try{assert.deepEqual(await inspect(),{commit:x.commit,tree:x.tree,baseCommit:x.baseCommit});assert.notEqual(x.git('rev-parse','HEAD^'),x.baseCommit);await assert.rejects(inspect(x.baseCommit),/checkout_changed/);await assert.rejects(inspect(x.commit,x.baseCommit,x.git('rev-parse',x.baseCommit+'^{tree}')),/checkout_changed/);writeFileSync(path.join(x.directory,'version.txt'),'unexpected');await assert.rejects(inspect(),/checkout_changed/);writeFileSync(path.join(x.directory,'version.txt'),'accepted correction');x.git('switch','main');await assert.rejects(inspect(),/checkout_changed/);x.git('switch',manifest.repository.candidateBranch);x.git('remote','set-url','origin','https://github.com/example/other');await assert.rejects(inspect(),/origin_changed/);x.git('remote','set-url','origin',manifest.repository.url);const unrelated=x.git('commit-tree',x.tree,'-m','unrelated root');await assert.rejects(inspect(x.commit,unrelated),/checkout_changed/);assert.equal(x.git('status','--porcelain'),'');assert.equal(x.git('rev-parse','HEAD'),x.commit);}finally{cleanupCheckout(x);}});
test('real ancestry range exceeding100 commits is refused before upload',async()=>{const x=actualCheckout();try{let head=x.commit;for(let n=0;n<99;n++)head=x.git('commit-tree',x.tree,'-p',head,'-m','bounded synthetic ancestry '+n);x.git('update-ref','refs/heads/'+manifest.repository.candidateBranch,head,x.commit);await assert.rejects(inspectReleaseCheckout(x.manifest,head,x.baseCommit,x.tree),/checkout_changed/);assert.equal(x.git('status','--porcelain'),'');}finally{cleanupCheckout(x);}});

import {compatibleFixture} from './fixtures/release-compatible-recovery.mjs';
function compatiblePublication(){const f=compatibleFixture();const recovery=f.input.compatibleArtifactRecovery;recovery.publication={mode:'new_exact_commit',baseCommit:publication,baseTree:publicationTree};return {...binding,manifest:publicationManifest,compatibleArtifactRecovery:recovery};}
test('compatible recovery records real publication commit/tree through push PR review merge',async()=>{const b=compatiblePublication(),h=publicationHarness();for(const value of [await h.adapter.push(publicationManifest,b),await h.adapter.createPullRequest(publicationManifest,b),await h.adapter.recordIndependentReview(publicationManifest,b,3),await h.adapter.merge(publicationManifest,b,3)]){assert.equal(value.remoteBase,publication);assert.equal(value.remoteBaseTree,publicationTree);assert.equal(value.remoteTree,tree);}assert.equal(h.uploads,1);assert.equal(h.calls.filter(c=>c.method==='PATCH').length,1);});
test('compatible uncertain push reconciles exact remote tree without another upload',async()=>{const b=compatiblePublication(),h=publicationHarness({losePush:true});await assert.rejects(h.adapter.push(publicationManifest,b),e=>e.uncertain===true);const writes=h.calls.filter(c=>c.method!=='GET').length,r=await h.adapter.reconcile(publicationManifest,b,'push');assert.equal(r.status,'succeeded');assert.equal(r.evidence.remoteBase,publication);assert.equal(r.evidence.remoteBaseTree,publicationTree);assert.equal(h.uploads,1);assert.equal(h.calls.filter(c=>c.method!=='GET').length,writes);});
test('compatible changed main/tree and mixed scope refuse before mutation',async()=>{const b=compatiblePublication();for(const options of [{main:'6'.repeat(40)},{mainTree:'6'.repeat(40)}]){const h=publicationHarness(options);await assert.rejects(h.adapter.push(publicationManifest,b));assert.equal(h.uploads,0);assert(h.calls.every(c=>c.method==='GET'));}for(const change of [{gitPublicationBase:{commit:publication,tree:publicationTree}},{recoveryOnly:{}},{compatibleArtifactRecovery:{}}]){const h=publicationHarness();await assert.rejects(h.adapter.push(publicationManifest,{...b,...change}));assert.equal(h.uploads,0);} });
test('compatible lost merge reconciles exact candidate and original publication tree readonly',async()=>{const b=compatiblePublication(),h=publicationHarness({loseMerge:true,head:commit});await h.adapter.createPullRequest(publicationManifest,b);await assert.rejects(h.adapter.merge(publicationManifest,b,3),e=>e.uncertain===true);const writes=h.calls.filter(c=>c.method!=='GET').length,r=await h.adapter.reconcile(publicationManifest,b,'merge',3);assert.equal(r.status,'succeeded');assert.equal(r.evidence.remoteBase,publication);assert.equal(r.evidence.remoteBaseTree,publicationTree);assert.equal(h.calls.filter(c=>c.method!=='GET').length,writes);});
