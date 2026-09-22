import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {temporaryWindowsJobLauncher,startWindowsJob} from './lib/agent-host-windows-job.mjs';
import {sourcePin,installerHash,stages,assertNewRoot,inventory,assertNoOverlap,validateFrames,assertOwned,validateReceipt,within} from './lib/hermes-manual-install.mjs';

test('result requires ordered complete stages, native exit and no skip/failure',()=>{
 const frames=stages.map(stage=>({type:'stage',stage,ok:true,skipped:false,exitCode:0}));
 const encode=a=>[...a,{type:'complete',ok:true}].map(x=>JSON.stringify(x)).join('\n');
 assert.equal(validateFrames(encode(frames),0).length,4);
 for(const changed of [frames.slice(1),[...frames].reverse(),[...frames,frames[0]],frames.map((f,i)=>i?f:{...f,skipped:true}),frames.map((f,i)=>i?f:{...f,exitCode:1})])assert.throws(()=>validateFrames(encode(changed),0));
 assert.throws(()=>validateFrames(encode(frames),1));
});
test('new target cannot overlap protected roots, existing targets or prefix siblings',()=>{
 const p=fs.realpathSync.native(os.tmpdir()),r=fs.mkdtempSync(path.join(p,'manual-boundary-'));
 try {assertNewRoot(path.join(r,'new'),[path.join(r,'protected')]);assert.throws(()=>assertNewRoot(r,[]));assert.throws(()=>assertNewRoot(path.join(r,'protected','new'),[path.join(r,'protected')]));assert.equal(within(path.join(r,'one'),path.join(r,'one-more')),false);}finally{fs.rmSync(r,{recursive:true});}
});
test('inventory catches drift and hardlink overlap; ownership gates rollback',()=>{
 const p=fs.realpathSync.native(os.tmpdir()),r=fs.mkdtempSync(path.join(p,'manual-inventory-'));
 try {const a=path.join(r,'a'),b=path.join(r,'b');fs.mkdirSync(a);fs.mkdirSync(b);fs.writeFileSync(path.join(a,'data'),'before');const before=inventory(a);
 fs.linkSync(path.join(a,'data'),path.join(b,'link'));assert.throws(()=>assertNoOverlap(inventory(b),[before]),/physical_overlap/);
 assertOwned(r,String(fs.statSync(r,{bigint:true}).ino));assert.throws(()=>assertOwned(r,'0'),/rollback_ownership/);
 fs.writeFileSync(path.join(a,'data'),'after');assert.notEqual(inventory(a).digest,before.digest);
 }finally{fs.rmSync(r,{recursive:true});}
});
test('receipt is tied to inventory, exact source, installer and version',()=>{
 const current={digest:'a'.repeat(64)},good={schemaVersion:'hermes-manual-install-v1',sourcePin,version:'0.21.3',installerSha256:installerHash,inventoryDigest:current.digest,profileCreated:false};
 validateReceipt(good,current);
 for(const changed of [{...good,sourcePin:'wrong'},{...good,version:'0.21.2'},{...good,installerSha256:'wrong'},{...good,profileCreated:true}])assert.throws(()=>validateReceipt(changed,current));
 assert.throws(()=>validateReceipt(good,{digest:'changed'}));
});
test('PowerShell child script exit returns to the sequential stage driver',{skip:process.platform!=='win32'},()=>{
 const p=fs.realpathSync.native(os.tmpdir()),r=fs.mkdtempSync(path.join(p,'manual-stage-protocol-'));
 try {const child=path.join(r,'child.ps1'),driver=path.join(r,'driver.ps1');fs.writeFileSync(child,"Write-Output 'frame'\nexit 0\n");fs.writeFileSync(driver,"param([string]$Child)\n& $Child\nif ($LASTEXITCODE -ne 0) {exit 1}\nWrite-Output 'continued'\n");
 const result=execFileSync(path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe'),['-NoProfile','-File',driver,'-Child',child],{windowsHide:true,encoding:'utf8',timeout:10000});assert.deepEqual(result.trim().split(/\r?\n/),['frame','continued']);
 }finally{fs.rmSync(r,{recursive:true});}
});
test('all PowerShell informational streams are captured before JSON framing',{skip:process.platform!=='win32'},()=>{
 const p=fs.realpathSync.native(os.tmpdir()),r=fs.mkdtempSync(path.join(p,'manual-streams-'));
 try {const child=path.join(r,'child.ps1'),driver=path.join(r,'driver.ps1');
 fs.writeFileSync(child,"Write-Host 'human progress'\nWrite-Warning 'human warning'\nWrite-Output '{\"stage\":\"repository\",\"ok\":true}'\nexit 0\n");
 fs.writeFileSync(driver,"param([string]$Child)\n& $Child *>&1 | ForEach-Object {try {$f=$_.ToString() | ConvertFrom-Json -ErrorAction Stop} catch {$f=$null}; if ($f -and $f.ok -is [bool]) {$f | ConvertTo-Json -Compress}}\n");
 const ps=path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe');const out=execFileSync(ps,['-NoProfile','-File',driver,'-Child',child],{windowsHide:true,encoding:'utf8',timeout:10000,env:{...process.env,PSModulePath:path.join(path.dirname(ps),'Modules')}});
 assert.deepEqual(JSON.parse(out.trim()),{stage:'repository',ok:true});
 }finally{fs.rmSync(r,{recursive:true});}
});
test('filtered synthetic PowerShell frames survive the owned native Job',{skip:process.platform!=='win32'},async()=>{
 const parent=fs.realpathSync.native(os.tmpdir()),dir=fs.mkdtempSync(path.join(parent,'manual-job-framing-'));
 try {
  const fixture=path.join(dir,'fixture.ps1');
  const script="[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)\nforeach($stage in @('repository','python','venv','dependencies')) { & { Write-Host 'progress'; @{type='stage';stage=$stage;ok=$true;skipped=$false;exitCode=0} | ConvertTo-Json -Compress } *>&1 | ForEach-Object {try {$f=$_.ToString() | ConvertFrom-Json -ErrorAction Stop} catch {$f=$null};if($f){$f | ConvertTo-Json -Compress}} }\n@{type='complete';ok=$true}|ConvertTo-Json -Compress\n";
  fs.writeFileSync(fixture,script);
  await temporaryWindowsJobLauncher(async launcher=>{
   const ps=path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe');let output='';
   const child=await startWindowsJob(launcher,{executable:ps,argv:['-NoProfile','-NonInteractive','-File',fixture],cwd:dir,input:'',durationMs:10000,
    environment:{SystemRoot:process.env.SystemRoot,WINDIR:process.env.SystemRoot,PSModulePath:path.join(path.dirname(ps),'Modules'),HOME:dir,USERPROFILE:dir,TEMP:dir,TMP:dir},
    onData(channel,data){assert.equal(channel,'stdout');output+=data.toString('utf8');}});
   const receipt=await child.completion;assert.equal(receipt.cleanup,true);assert.equal(validateFrames(output,receipt.rootExit).length,4);
  });
 }finally{fs.rmSync(dir,{recursive:true});}
});
