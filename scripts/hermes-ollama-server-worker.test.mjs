import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {serverCapture} from './hermes-ollama-server-worker.mjs';
import {temporaryWindowsJobLauncher,startWindowsJob} from './lib/hermes-manual-model-job.mjs';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';

test('server tails are bounded and old native caps are evidence, not stop triggers',()=>{
  const c=serverCapture(1024);for(let i=0;i<10000;i++)c.consume('stderr',Buffer.alloc(1024,65));
  assert.equal(c.raw().stderr.length,1024);assert.equal(c.metrics().rawBytes.stderr,10240000);
  assert.equal(c.metrics().oldLimitCrossings.stderr.oldLimit,32768);
});
test('resource sampler follows owned descendants regardless of executable name',{skip:process.platform!=='win32'},async()=>{
  const dir=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'ollama-telemetry-fixture-'));
  try{
    const script=path.join(dir,'tree.cjs');
    fs.writeFileSync(script,"const {spawn}=require('node:child_process'); const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{windowsHide:true,stdio:'ignore'}); child.on('spawn',()=>console.log(JSON.stringify({root:process.pid,child:child.pid}))); setInterval(()=>{},1000);\n");
    await temporaryWindowsJobLauncher(async artifact=>{
      let buffer='',resolveIds;const idsReady=new Promise(resolve=>{resolveIds=resolve;});
      const job=await startWindowsJob(artifact,{executable:process.execPath,argv:[script],cwd:dir,
        environment:{SystemRoot:process.env.SystemRoot},input:'',durationMs:20000,
        onData(channel,data){buffer+=data;if(buffer.includes('\n'))resolveIds(JSON.parse(buffer.trim()));}});
      try{
      const ids=await idsReady;
      const {stdout}=await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-File',
        fileURLToPath(new URL('./ollama-diagnostic-sample.ps1',import.meta.url)),'-RootProcessId',String(ids.root)],{windowsHide:true,timeout:15000});
      const sample=JSON.parse(stdout),found=new Set(sample.processes.map(p=>p.pid));
      assert.ok(found.has(ids.root)&&found.has(ids.child));
      assert.ok(sample.processes.every(p=>p.pid===ids.root||found.has(p.parentPid)));
      assert.ok(sample.processes.every(p=>p.workingSetBytes>0));
      }finally{
      job.stop('cancel');const receipt=await job.completion;assert.equal(receipt.cleanup,true);assert.equal(receipt.activeProcesses,0);
      }
    });
  }finally{fs.rmSync(dir,{recursive:true});}
});
test('owned noisy server survives old cap until an explicit controller stop',{skip:process.platform!=='win32'},async()=>{
  const dir=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'ollama-server-fixture-'));
  try{
    fs.writeFileSync(path.join(dir,'serve'),"process.stderr.write('x'.repeat(2*1024*1024)); setInterval(()=>{},1000);\n");
    await temporaryWindowsJobLauncher(async artifact=>{
      let wire='',started;const ready=new Promise(resolve=>{started=resolve;});
      const job=await startWindowsJob(artifact,{executable:process.execPath,
        argv:[fileURLToPath(new URL('./hermes-ollama-server-worker.mjs',import.meta.url)),process.execPath,dir],
        cwd:dir,environment:{SystemRoot:process.env.SystemRoot},input:'',durationMs:20000,
        onData(channel,data){assert.equal(channel,'stdout');wire+=data;if(wire.includes('server_progress'))started();}});
      await Promise.race([ready,job.completion.then(()=>{throw Error('server_stopped_before_controller');})]);
      fs.writeFileSync(path.join(dir,'stop-server'),'');
      const result=await job.completion,exit=wire.trim().split('\n').map(x=>JSON.parse(x)).find(x=>x.type==='server_exit');
      assert.equal(result.cleanup,true);assert.equal(result.activeProcesses,0);assert.equal(result.terminationReason,'root_exit');
      assert.equal(exit.controllerStopRequested,true);assert.equal(exit.rawBytes.stderr,2*1024*1024);
      assert.ok(wire.length<4096);assert.ok(fs.statSync(path.join(dir,'server-tail.private.json')).size<140000);
    });
  }finally{fs.rmSync(dir,{recursive:true});}
});
