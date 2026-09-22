import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {summarizeLog,stagePostcondition,runDirectSequence} from './lib/hermes-manual-direct.mjs';
import {temporaryWindowsJobLauncher,startWindowsJob} from './lib/agent-host-windows-job.mjs';
const good={exitCode:0,cleanup:true,terminationReason:'root_exit'};

test('four stages run once in order within a shared deadline',async()=>{
 const calls=[];let time=0;
 const rows=await runDirectSequence({deadline:100,now:()=>time,run:async(stage,remaining)=>{calls.push([stage,remaining]);time+=10;return good;},postcondition:()=>true});
 assert.deepEqual(calls,[['repository',100],['python',90],['venv',80],['dependencies',70]]);assert.equal(rows.length,4);
});
test('nonzero, timeout and filesystem failure stop without retry',async()=>{
 for(const failure of [{exitCode:1},{terminationReason:'timeout'},{cleanup:false},{postcondition:false}]) {
  const seen=[];
  await assert.rejects(runDirectSequence({deadline:Date.now()+10000,run:async stage=>{seen.push(stage);return {...good,...(stage==='python'?failure:{})};},postcondition:stage=>!(stage==='python'&&failure.postcondition===false)}),/direct_stage_failed/);
  assert.deepEqual(seen,['repository','python']);
 }
 let called=false;await assert.rejects(runDirectSequence({deadline:0,now:()=>1,run:async()=>{called=true;},postcondition:()=>true}),/installation_deadline/);assert.equal(called,false);
});
test('filesystem checks reject missing and duplicate installed distribution',()=>{
 const root=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'direct-conditions-'));
 const put=(rel,text)=>{const f=path.join(root,rel);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,text);};
 try {
  assert.equal(stagePostcondition('repository',root),false);assert.equal(stagePostcondition('python',root),false);
  put('.hermes-runtime/python/cpython-3.13.1-windows-x86_64-none/python.exe','fixture');assert.equal(stagePostcondition('python',root),true);
  put('venv/Scripts/python.exe','fixture');put('venv/pyvenv.cfg','home = '+path.join(root,'.hermes-runtime/python/cpython-3.13.1-windows-x86_64-none')+'\ninclude-system-site-packages = false\n');assert.equal(stagePostcondition('venv',root),true);
  put('venv/Scripts/hermes.exe','fixture');put('venv/Lib/site-packages/hermes_agent-0.21.3.dist-info/METADATA','Name: hermes-agent\nVersion: 0.21.3\n');put('venv/Lib/site-packages/hermes_agent-0.21.3.dist-info/entry_points.txt','[console_scripts]\nhermes = hermes_cli.main:main\n');assert.equal(stagePostcondition('dependencies',root),true);
  fs.mkdirSync(path.join(root,'venv/Lib/site-packages/hermes_agent-0.21.2.dist-info'));assert.equal(stagePostcondition('dependencies',root),false);
 }finally{fs.rmSync(root,{recursive:true});}
});
test('log evidence contains hashes and fixed classifications, no raw text',()=>{
 const summary=summarizeLog(Buffer.from('Bearer SECRET_TOKEN C:\\private\\operator\nConnection refused https://github.com/example\n'));
 const text=JSON.stringify(summary);assert.equal(text.includes('SECRET_TOKEN'),false);assert.equal(text.includes('operator'),false);assert.equal(summary.sha256.length,64);assert.deepEqual(summary.classifications,['network_failure']);assert.deepEqual(summary.mentionedOfficialHosts,['github.com']);
});
test('direct owned PowerShell preserves non-JSON stdout/stderr in private files',{skip:process.platform!=='win32'},async()=>{
 const dir=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'direct-logs-'));
 try{
  const script=path.join(dir,'synthetic.ps1');fs.writeFileSync(script,"Write-Host 'ordinary output'\n[Console]::Error.WriteLine('private synthetic diagnostic')\nexit 7\n");
  const logs={stdout:path.join(dir,'stdout.log'),stderr:path.join(dir,'stderr.log')};const fds=Object.fromEntries(Object.entries(logs).map(([k,v])=>[k,fs.openSync(v,'wx')]));
  try{await temporaryWindowsJobLauncher(async launcher=>{
   const ps=path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe');
   const child=await startWindowsJob(launcher,{executable:ps,argv:['-NoProfile','-File',script],cwd:dir,input:'',durationMs:10000,environment:{SystemRoot:process.env.SystemRoot,WINDIR:process.env.SystemRoot,PSModulePath:path.join(path.dirname(ps),'Modules'),HOME:dir,USERPROFILE:dir,TEMP:dir,TMP:dir},onData(channel,data){fs.writeSync(fds[channel],data);}});
   const receipt=await child.completion;assert.equal(receipt.rootExit,7);assert.equal(receipt.cleanup,true);
  });}finally{for(const fd of Object.values(fds))fs.closeSync(fd);}
  for(const file of Object.values(logs))assert.ok(summarizeLog(fs.readFileSync(file)).bytes>0);
 }finally{fs.rmSync(dir,{recursive:true});}
});
