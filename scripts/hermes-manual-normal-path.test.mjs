import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {checkEffectiveResolution,readEffectivePath,sameEffectivePath,normalWindowsFolders} from './lib/hermes-manual-normal-path.mjs';
import {qualifiedEnvironment} from './lib/hermes-manual-toolchain.mjs';
test('effective registry resolution accepts the known binary and refuses shadowing/aliases/missing commands',()=>{
 const root=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'manual-path-test-'));
 try{
  const executable=path.join(root,'uv.exe');fs.writeFileSync(executable,'synthetic executable identity only');
  const snapshot={path:root,commands:[{name:'uv',type:'Application',path:executable}]};
  assert.equal(checkEffectiveResolution(snapshot,{uv:[executable]})[0].sha256.length,64);
  assert.throws(()=>checkEffectiveResolution({...snapshot,commands:[{...snapshot.commands[0],type:'Alias'}]},{uv:[executable]}),/effective_command_shadowed/);
  assert.throws(()=>checkEffectiveResolution(snapshot,{uv:[path.join(root,'unexpected.exe')]}),/effective_command_shadowed/);
  assert.throws(()=>checkEffectiveResolution({...snapshot,commands:[]},{uv:[executable]}),/effective_commands_missing/);
 }finally{assert.equal(fs.realpathSync.native(root),root);assert.ok(path.basename(root).startsWith('manual-path-test-'));fs.rmSync(root,{recursive:true});}
});
test('effective comparison ignores JSON object order but detects PATH and binary changes',()=>{
 const a={path:'A;B',commands:[{name:'git',path:'X',type:'Application'},{name:'uv',path:'Y',type:'Application'}]};
 assert.equal(sameEffectivePath(a,{path:a.path,commands:[...a.commands].reverse()}),true);
 assert.equal(sameEffectivePath(a,{...a,path:'B;A'}),false);
 assert.equal(sameEffectivePath(a,{...a,commands:[{...a.commands[0],path:'poison'},a.commands[1]]}),false);
});
test('registry reader reproduces upstream User+Machine PATH with clean credential environment',{skip:process.platform!=='win32'},()=>{
 const ps=path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe');
 const env=qualifiedEnvironment({systemRoot:process.env.SystemRoot,home:os.tmpdir(),cache:os.tmpdir(),executables:[]});
 const result=readEffectivePath(ps,env);
 assert.equal(result.commands.length,5);assert.ok(result.commands.every(c=>c.type==='Application'&&path.isAbsolute(c.path)));
 assert.ok(result.path!==env.PATH);assert.equal(env.HTTP_PROXY,undefined);assert.equal(env.GIT_ASKPASS,undefined);
});
test('manual Windows folder selectors allow the system SSH version probe without credentials',{skip:process.platform!=='win32'},()=>{
 const root=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'manual-ssh-test-'));
 try{
  fs.mkdirSync(path.join(root,'temp'));
  const base=qualifiedEnvironment({systemRoot:process.env.SystemRoot,home:root,cache:root,executables:[]});
  const env=normalWindowsFolders(base,process.env.SystemRoot,process.env.ProgramData);
  assert.equal(base.PROGRAMDATA,undefined);assert.ok(path.isAbsolute(env.PROGRAMDATA));
  for(const key of ['HTTP_PROXY','HTTPS_PROXY','GIT_ASKPASS','SSH_AUTH_SOCK','OPENAI_API_KEY'])assert.equal(env[key],undefined);
  const result=spawnSync(path.join(process.env.SystemRoot,'System32/OpenSSH/ssh.exe'),['-V'],{env,cwd:root,windowsHide:true,timeout:10000});
  assert.equal(result.status,0);assert.match(result.stderr.toString(),/OpenSSH_for_Windows/);
 }finally{assert.equal(fs.realpathSync.native(root),root);assert.ok(path.basename(root).startsWith('manual-ssh-test-'));fs.rmSync(root,{recursive:true});}
});
