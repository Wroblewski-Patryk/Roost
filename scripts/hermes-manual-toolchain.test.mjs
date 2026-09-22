import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {executableIdentity,verifyExecutable,qualifiedEnvironment,analyzeSource,sourceAdmission,assertQualifiedSource,probeToolchain,assertToolchainNoOverlap} from './lib/hermes-manual-toolchain.mjs';
import {inventory} from './lib/hermes-manual-install.mjs';
const scripts=path.dirname(fileURLToPath(import.meta.url));
const ps=path.join(process.env.SystemRoot??'', 'System32/WindowsPowerShell/v1.0/powershell.exe');
function fixture(fn) {
 const root=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'toolchain-test-'));
 try {return fn(root);}finally {
  assert.equal(fs.realpathSync.native(root),root);assert.ok(path.basename(root).startsWith('toolchain-test-'));
  fs.rmSync(root,{recursive:true});
 }
}
test('exact file identity rejects hash drift, missing tool and protected origin',()=>fixture(root=>{
 const file=path.join(root,'fixture.exe');fs.writeFileSync(file,'one');const expected=executableIdentity(file);
 assert.deepEqual(verifyExecutable(expected),expected);
 fs.writeFileSync(file,'two');assert.throws(()=>verifyExecutable(expected),/tool_drift/);
 assert.throws(()=>executableIdentity(file,[root]),/tool_origin/);
 assert.throws(()=>executableIdentity(path.join(root,'missing.exe')),/tool_missing/);
 const protectedDir=path.join(root,'protected');fs.mkdirSync(protectedDir);fs.linkSync(file,path.join(protectedDir,'same.exe'));
 assert.throws(()=>assertToolchainNoOverlap([executableIdentity(file)],[inventory(protectedDir)]),/physical_overlap/);
}));
test('planned environment has explicit PATH, PATHEXT and system modules; inherits no credentials',()=>fixture(root=>{
 const previous=process.env.GITHUB_TOKEN;process.env.GITHUB_TOKEN='synthetic-poison';
 try {
  const env=qualifiedEnvironment({systemRoot:process.env.SystemRoot??root,home:root,cache:root,
   executables:[{path:path.join(root,'qualified','uv.exe'),command:'uv'},{path:path.join(root,'helper','helper.exe'),command:null}]});
  assert.ok(env.PATH.startsWith(path.join(root,'qualified')));assert.ok(!env.PATH.includes(path.join(root,'helper')));
  assert.equal(env.PATHEXT,'.EXE');assert.ok(env.PSModulePath.endsWith(path.join('WindowsPowerShell','v1.0','Modules')));
  for(const key of ['GITHUB_TOKEN','OPENAI_API_KEY','SSH_AUTH_SOCK','GIT_ASKPASS','PYTHONPATH','UV_INDEX_URL','HTTP_PROXY'])assert.equal(env[key],undefined);
  assert.equal(env.GIT_CONFIG_PARAMETERS,"'credential.helper=' 'core.askPass='");assert.equal(env.GIT_TERMINAL_PROMPT,'0');
 }finally{if(previous===undefined)delete process.env.GITHUB_TOKEN;else process.env.GITHUB_TOKEN=previous;}
}));
test('source admission denies registry PATH and unknown/dynamic build executables',()=>{
 const base={commands:[],pathWrites:[],processLaunches:[],functions:[]};
 assert.equal(sourceAdmission(base).result,'PASS');
 assert.throws(()=>assertQualifiedSource({...base,pathWrites:[{function:'Sync-EnvPath'}]}),/installer_replaces_qualified_path/);
 assert.ok(sourceAdmission({...base,commands:[{head:'$unknown'}]}).blockers.includes('unknown_dynamic_command'));
 assert.ok(sourceAdmission({...base,commands:[{head:'$resolvedPython.Path'}]}).blockers.includes('generated_python_not_prequalified'));
 assert.ok(sourceAdmission({...base,functions:['Install-Dependencies']}).blockers.includes('dependency_build_closure_unqualified'));
 assert.ok(sourceAdmission({...base,processLaunches:[{value:'$unknown'}]}).blockers.includes('unknown_process_launch'));
});
test('AST enumerates nested fallback/dynamic/process commands without executing source',{skip:process.platform!=='win32'},()=>fixture(root=>{
 const names=['Set-LongProfileEnvVars','ConvertTo-LongPath','Get-LongProfileRoot','Get-InstallStage','Step-OutOfInstallDir','Stage-Python','Stage-Venv','Stage-Dependencies'];
 const source=names.map(n=>'function '+n+' {}').join('\n')+`
function Sync-EnvPath { $env:Path = [Environment]::GetEnvironmentVariable('Path','User') }
function Invoke-Stage { Sync-EnvPath; & $StageDef.Worker }
function Stage-Repository { Install-Repository }
function Install-Repository { git --version; try { git clone example } catch { Invoke-WebRequest example; Expand-Archive example }; & $Python; $p.FileName=$UvCmd }
throw 'MUST_NOT_EXECUTE'
`;
 const file=path.join(root,'source.ps1');fs.writeFileSync(file,source);
 const env=qualifiedEnvironment({systemRoot:process.env.SystemRoot,home:root,cache:root,executables:[]});
 const parsed=JSON.parse(execFileSync(ps,['-NoProfile','-File',path.join(scripts,'hermes_manual_source_commands.ps1'),'-Source',file],{env,encoding:'utf8'}));
 for(const command of ['git','Invoke-WebRequest','Expand-Archive'])assert.ok(parsed.commands.some(c=>c.name===command));
 assert.ok(parsed.commands.some(c=>c.head==='$Python'));assert.equal(parsed.processLaunches[0].value,'$UvCmd');
 assert.equal(parsed.pathWrites[0].function,'Sync-EnvPath');assert.throws(()=>analyzeSource(file,ps,env),/installer_identity/);
}));
test('same-environment native probe accepts exact command and denies PATH/hash/missing-module poisoning',{skip:process.platform!=='win32'},()=>fixture(root=>{
 const expected={name:'cmd',command:'cmd',...executableIdentity(path.join(process.env.SystemRoot,'System32/cmd.exe'))};
 const env=qualifiedEnvironment({systemRoot:process.env.SystemRoot,home:root,cache:root,executables:[expected]});
 const run=(e,commands=['Test-Path','ConvertTo-Json','Expand-Archive'])=>probeToolchain({powershell:ps,env:e,cwd:root,executables:[expected],commands});
 const good=run(env);assert.equal(good.result,'PASS',JSON.stringify(good.failures));
 assert.ok(good.modules.some(m=>m.name==='Microsoft.PowerShell.Archive'));
 const poison=path.join(root,'poison');fs.mkdirSync(poison);fs.copyFileSync(expected.path,path.join(poison,'cmd.exe'));
 assert.equal(run({...env,PATH:poison+';'+env.PATH}).result,'BLOCKED');
 assert.equal(run(env,['Definitely-Not-A-System-Command']).result,'BLOCKED');
 assert.throws(()=>probeToolchain({powershell:ps,env,cwd:root,executables:[{...expected,sha256:'0'.repeat(64)}],commands:[]}),/tool_drift/);
 // A malicious PowerShell function/module outside the system module root is refused.
 const moduleRoot=path.join(root,'PoisonModules'),mod=path.join(moduleRoot,'Evil');fs.mkdirSync(mod,{recursive:true});
 fs.writeFileSync(path.join(mod,'Evil.psm1'),'function Get-PoisonedCommand { "not invoked" }; Export-ModuleMember -Function Get-PoisonedCommand');
 assert.equal(run({...env,PSModulePath:moduleRoot+';'+env.PSModulePath},['Get-PoisonedCommand']).result,'BLOCKED');
}));
