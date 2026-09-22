import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {Worker} from 'node:worker_threads';
import {once} from 'node:events';
import {inspectLiveOwned} from './lib/hermes-manual-live-monitor.mjs';
import {inventory} from './lib/hermes-manual-install.mjs';
async function fixture(run){
 const root=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'live-monitor-test-'));
 const code=path.join(root,'runtime');fs.mkdirSync(code);
 const scope={root,identity:String(fs.statSync(root,{bigint:true}).ino),allowedRoots:[code],maxMs:5000};
 try{await run(scope,code);}finally{assert.equal(fs.realpathSync.native(root),root);assert.ok(path.basename(root).startsWith('live-monitor-test-'));fs.rmSync(root,{recursive:true});}
}
test('normal concurrent create/write/rename/delete mutations do not require stable inventory',()=>fixture(async(scope,code)=>{
 const worker=new Worker(`const fs=require('node:fs'),path=require('node:path');const{parentPort,workerData:root}=require('node:worker_threads');
 const a=path.join(root,'download.tmp'),b=path.join(root,'checkout.tmp');
 parentPort.postMessage('ready');let count=0;
 function churn(){try{fs.writeFileSync(a,Buffer.alloc(1+(count++%10000)));fs.renameSync(a,b);fs.appendFileSync(b,'changed');fs.unlinkSync(b);}catch(e){parentPort.postMessage({error:e.code});}setImmediate(churn);}churn();`,{eval:true,workerData:code});
 try{await once(worker,'message');for(let i=0;i<100;i++)assert.equal(typeof inspectLiveOwned(scope).observedBytes,'number');}
 finally{await worker.terminate();}
}));
test('unexpected root entries, junction escapes and known protected hardlinks are refused',()=>fixture(async(scope,code)=>{
 fs.writeFileSync(path.join(scope.root,'outside-allowlist'),'fixture');assert.throws(()=>inspectLiveOwned(scope),/live_path_not_allowed/);fs.unlinkSync(path.join(scope.root,'outside-allowlist'));
 const external=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'live-external-test-'));
 try{
  fs.writeFileSync(path.join(external,'protected'),'fixture');
  fs.symlinkSync(external,path.join(code,'escape'),'junction');assert.throws(()=>inspectLiveOwned(scope),/live_path_escape/);
  assert.throws(()=>inventory(scope.root,{allowInternalLinks:true}),/tree_link_escape/);fs.unlinkSync(path.join(code,'escape'));
  fs.linkSync(path.join(external,'protected'),path.join(code,'linked'));
  const protectedIds=new Set(inventory(external).rows.map(r=>r.fileId));assert.throws(()=>inspectLiveOwned({...scope,protectedIds}),/live_protected_overlap/);
 }finally{assert.equal(fs.realpathSync.native(external),external);assert.ok(path.basename(external).startsWith('live-external-test-'));fs.rmSync(external,{recursive:true});}
}));
test('private uv-style version aliases are allowed live and explicitly in stopped inventories',()=>fixture(async(scope,code)=>{
 const actual=path.join(code,'python-3.11.16');fs.mkdirSync(actual);fs.writeFileSync(path.join(actual,'python.exe'),'fixture');
 fs.symlinkSync(actual,path.join(code,'python-3.11'),'junction');
 assert.equal(inspectLiveOwned(scope).complete,true);
 assert.throws(()=>inventory(scope.root),/tree_link/);
 const after=inventory(scope.root,{allowInternalLinks:true});assert.equal(after.files,1);assert.equal(after.rows.filter(r=>r.kind==='link').length,1);
}));
test('byte budget still applies; bounded sampling is explicitly incomplete',()=>fixture(async(scope,code)=>{
 fs.writeFileSync(path.join(code,'large'),Buffer.alloc(1024));
 assert.throws(()=>inspectLiveOwned({...scope,maxBytes:100}),/live_size_budget/);
 const partial=inspectLiveOwned({...scope,maxEntries:1});assert.equal(partial.complete,false);
 assert.throws(()=>inspectLiveOwned({...scope,identity:'wrong'}),/rollback_ownership/);
}));
