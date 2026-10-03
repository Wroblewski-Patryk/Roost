import test from 'node:test';
import assert from 'node:assert/strict';
import { createGithubReleaseAdapter } from './lib/agent-host-release-github.mjs';

const commit='a'.repeat(40), base='b'.repeat(40), tree='c'.repeat(40);
const manifest={repository:{url:'https://github.com/example/certificate',defaultBranch:'main',candidateBranch:'codex/certificate',canonicalDir:'C:\\test\\certificate'}};
const binding={commit,baseCommit:base,candidateTree:tree,reviewId:'independent-decision',materialVersion:'d'.repeat(64)};
const repo={private:true,archived:false,default_branch:'main',full_name:'example/certificate'};
const pr={number:1,head:{sha:commit,ref:'codex/certificate',repo:{full_name:'example/certificate'}},base:{ref:'main'},state:'open',merged:false};
function harness({main=base,head=commit,privateRepo=true,mutation=async()=>({status:200,body:{}})}={}) {
 const calls=[];
 const transport=async r=>{calls.push(r); if(r.method!=='GET')return mutation(r);
  if(r.route.endsWith('/git/ref/heads/main'))return{status:200,body:{object:{sha:main}}};
  if(r.route.endsWith('/git/ref/heads/codex/certificate'))return head?{status:200,body:{object:{sha:head}}}:{status:404,body:{}};
  if(r.route.endsWith(`/git/commits/${commit}`))return{status:200,body:{tree:{sha:tree},parents:[{sha:base}]}};
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
