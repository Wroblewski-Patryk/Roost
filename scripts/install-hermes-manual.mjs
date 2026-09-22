// Explicit one-shot manual installation. Never imported by Roost workers.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildWindowsJobLauncher,startWindowsJob} from './lib/agent-host-windows-job.mjs';
import {sourcePin,installerHash,sha256,assertNewRoot,inventory,assertNoOverlap,validateFrames,assertOwned,validateReceipt} from './lib/hermes-manual-install.mjs';

const scriptDir=path.dirname(fileURLToPath(import.meta.url));
const powershell=path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe');
const modulePath=path.join(path.dirname(powershell),'Modules');
const root=path.resolve(process.argv[2]??'');
const report={result:'BLOCKED',stages:[],fallbacks:[],attemptStarted:false,cleanup:false,managedUnchanged:false,profileUnchanged:false,machineStateUnchanged:false};
let rootId,before,machineBefore,child,receipt,phase='preflight',watchers=[],monitor,monitorFailure;
const machineState=()=>execFileSync(powershell,['-NoProfile','-File',path.join(scriptDir,'hermes_manual_machine_state.ps1')],{windowsHide:true,encoding:'utf8',timeout:20000,env:{...process.env,PSModulePath:modulePath},stdio:['ignore','pipe','pipe']}).trim();
const manifest=JSON.parse(fs.readFileSync(path.join(process.env.LOCALAPPDATA,'hermes/roost-worker-manifest.json'),'utf8'));
const protectedRoots={managed:fs.realpathSync.native(manifest.roots[0].path),profile:fs.realpathSync.native(path.join(process.env.LOCALAPPDATA,'Roost/hermes-pilot'))};
const sourceRoot=path.join(process.env.LOCALAPPDATA,'hermes/hermes-agent');
const originalInstaller=path.join(process.env.LOCALAPPDATA,'hermes/bootstrap-cache/install-main.ps1');
try {
  if(process.platform!=='win32'||process.argv.length!==3)throw Error('arguments');
  const packageCache=path.join(process.env.LOCALAPPDATA,'Packages');
  assertNewRoot(root,[process.cwd(),...Object.values(protectedRoots),sourceRoot,packageCache,fs.realpathSync.native(os.tmpdir())]);
  const disk=fs.statfsSync(path.dirname(root));if(disk.bavail*disk.bsize<20*1024**3)throw Error('disk_reserve');
  const installerBytes=fs.readFileSync(originalInstaller);
  const blob=execFileSync('git',['-C',sourceRoot,'show',sourcePin+':scripts/install.ps1'],{windowsHide:true,maxBuffer:1024*1024});
  if(sha256(installerBytes)!==installerHash||!installerBytes.subarray(3).equals(blob))throw Error('installer_identity');
  before=Object.fromEntries(Object.entries(protectedRoots).map(([k,v])=>[k,inventory(v)]));
  machineBefore=machineState();
  assertNewRoot(root,[process.cwd(),...Object.values(protectedRoots),sourceRoot,packageCache,fs.realpathSync.native(os.tmpdir())]);
  fs.mkdirSync(root);rootId=String(fs.statSync(root,{bigint:true}).ino);
  const home=path.join(root,'installation-home'),cache=path.join(root,'install-cache'),tools=path.join(root,'install-tools'),code=path.join(root,'runtime');
  for(const dir of [home,cache,tools,path.join(cache,'temp'),path.join(home,'Local'),path.join(home,'Roaming')])fs.mkdirSync(dir,{recursive:true});
  const installer=path.join(tools,'install.ps1');fs.writeFileSync(installer,installerBytes,{flag:'wx'});
  const launcher=await buildWindowsJobLauncher(tools);
  const env={SystemRoot:process.env.SystemRoot,WINDIR:process.env.SystemRoot,OS:'Windows_NT',PROCESSOR_ARCHITECTURE:'AMD64',
    PSModulePath:modulePath,
    COMSPEC:path.join(process.env.SystemRoot,'System32/cmd.exe'),PATH:path.join(process.env.SystemRoot,'System32'),
    USERPROFILE:home,HOME:home,HOMEDRIVE:path.parse(home).root.slice(0,2),HOMEPATH:home.slice(2),LOCALAPPDATA:path.join(home,'Local'),APPDATA:path.join(home,'Roaming'),
    TEMP:path.join(cache,'temp'),TMP:path.join(cache,'temp'),HERMES_HOME:home,HERMES_DISABLE_LAZY_INSTALLS:'1',
    PYTHONDONTWRITEBYTECODE:'1',PYTHONNOUSERSITE:'1',PYTHONUTF8:'1',UV_CACHE_DIR:path.join(cache,'uv'),UV_LINK_MODE:'copy',UV_NO_CONFIG:'1',
    GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:path.join(home,'.gitconfig'),GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'};
  let stdout='',pending='';
  const stop=reason=>{monitorFailure??=reason;child?.stop('preparation_failed');};
  for(const dir of Object.values(protectedRoots)) {
    const watcher=fs.watch(dir,{recursive:true},()=>stop('protected_tree_event'));watcher.on('error',()=>stop('protected_watch_failed'));watchers.push(watcher);
  }
  phase='installation';report.attemptStarted=true;
  child=await startWindowsJob(launcher,{executable:powershell,
    argv:['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(scriptDir,'hermes_manual_install_stages.ps1'),'-Installer',installer,'-InstallDir',code,'-InstallationHome',home,'-Commit',sourcePin],
    cwd:home,environment:env,input:'',durationMs:1200000,onData(channel,data){
      if(channel!=='stdout'){stop('wrapper_stderr');return;}
      stdout+=data.toString('utf8');if(Buffer.byteLength(stdout)>32768){stop('output_limit');return;}
      pending+=data.toString('utf8');for(let n;(n=pending.indexOf('\n'))>=0;){const line=pending.slice(0,n).replace(/^\uFEFF/,'').trim();pending=pending.slice(n+1);if(!line)continue;
        try {const f=JSON.parse(line);if(f.type==='fallback')report.fallbacks.push(f);console.log(JSON.stringify(f));}catch{report.invalidFrame={bytes:Buffer.byteLength(line),sha256:sha256(line)};stop('wrapper_protocol');}}
    }});
  monitor=setInterval(()=>{try{inventory(root,{hashes:false});const d=fs.statfsSync(root);if(d.bavail*d.bsize<8*1024**3)stop('disk_reserve');}catch{stop('manual_tree_boundary');}},5000);
  receipt=await child.completion;clearInterval(monitor);
  if(monitorFailure||!receipt.cleanup||receipt.activeProcesses!==0)throw Error(monitorFailure??'process_cleanup');
  report.stages=validateFrames(stdout,receipt.rootExit);
  phase='postflight';
  for(const w of watchers)w.close();watchers=[];
  if(execFileSync('git',['-C',code,'rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim()!==sourcePin)throw Error('source_drift');
  const after=Object.fromEntries(Object.entries(protectedRoots).map(([k,v])=>[k,inventory(v)]));
  report.managedUnchanged=before.managed.digest===after.managed.digest;report.profileUnchanged=before.profile.digest===after.profile.digest;
  report.machineStateUnchanged=machineBefore===machineState();
  if(!report.managedUnchanged||!report.profileUnchanged||!report.machineStateUnchanged)throw Error('protected_state_changed');
  const full=inventory(root);assertNoOverlap(full,Object.values(before));
  report.installerPassed=true;
  const initBytes=execFileSync('git',['-C',sourceRoot,'show',sourcePin+':hermes_cli/__init__.py'],{windowsHide:true,maxBuffer:65536});
  if(!fs.readFileSync(path.join(code,'hermes_cli/__init__.py')).equals(initBytes))throw Error('initializer_drift');
  const probeHome=path.join(cache,'probe-home');fs.mkdirSync(probeHome);
  let identityText='';
  const identityChild=await startWindowsJob(launcher,{executable:path.join(code,'venv/Scripts/python.exe'),
    argv:['-I','-S','-B',path.join(scriptDir,'hermes_manual_identity.py')],cwd:probeHome,
    environment:{SystemRoot:env.SystemRoot,WINDIR:env.WINDIR,HOME:probeHome,USERPROFILE:probeHome,HERMES_HOME:probeHome,TEMP:probeHome,TMP:probeHome,PYTHONUTF8:'1',HERMES_DISABLE_LAZY_INSTALLS:'1'},
    input:JSON.stringify({root:code,home:probeHome,initSha256:sha256(initBytes)}),durationMs:10000,
    onData(channel,data){if(channel!=='stdout')throw Error('identity_stderr');identityText+=data.toString('utf8');if(identityText.length>4096)throw Error('identity_output');}});
  receipt=await identityChild.completion;
  if(receipt.rootExit!==0||!receipt.cleanup||fs.readdirSync(probeHome).length)throw Error('identity_probe');
  const identity=JSON.parse(identityText);
  if(identity.version!=='0.21.3'||identity.distributions!==1||identity.mainImported!==false||identity.entrypoint!=='hermes_cli.main:main')throw Error('identity_result');
  report.identity=identity;
  // These are exclusively created children of our owned root. Recheck links
  // and ownership before deleting the one-off tool/download/temp directories.
  assertOwned(root,rootId);inventory(root,{hashes:false});
  await fsp.rm(cache,{recursive:true});await fsp.rm(tools,{recursive:true});
  const finalInventory=inventory(code);assertNoOverlap(finalInventory,Object.values(before));
  const attestation={schemaVersion:'hermes-manual-install-v1',sourcePin,version:'0.21.3',installerSha256:installerHash,
    root:code,interpreter:path.join(code,'venv/Scripts/python.exe'),executable:path.join(code,'venv/Scripts/hermes.exe'),
    sourceClass:'official_desktop_stage_installer',identity,stages:report.stages,fallbacks:report.fallbacks,
    inventoryDigest:finalInventory.digest,inventory:finalInventory.rows,profileCreated:false,launcherCreated:false};
  const receiptPath=path.join(root,'installation-receipt.json');fs.writeFileSync(receiptPath,JSON.stringify(attestation,null,2)+'\n',{flag:'wx'});
  validateReceipt(JSON.parse(fs.readFileSync(receiptPath,'utf8')),inventory(code));
  report.result='DONE';report.receipt='installation-receipt.json';report.cleanup=true;report.runtimeBytes=finalInventory.bytes;report.runtimeFiles=finalInventory.files;report.noOverlap=true;
} catch(error) {report.reason=/^[a-z_]{1,80}$/.test(error.message)?error.message:'operation_failed_closed';report.phase=phase;}
finally {
  clearInterval(monitor);for(const w of watchers)w.close();
  if(before){try{const after=Object.fromEntries(Object.entries(protectedRoots).map(([k,v])=>[k,inventory(v)]));report.managedUnchanged=before.managed.digest===after.managed.digest;report.profileUnchanged=before.profile.digest===after.profile.digest;report.protectedCounts=Object.fromEntries(Object.entries(after).map(([k,v])=>[k,{files:v.files,bytes:v.bytes}]));report.machineStateUnchanged=machineBefore===machineState();if(!report.managedUnchanged||!report.profileUnchanged||!report.machineStateUnchanged){report.result='BLOCKED';report.reason='protected_state_changed';}}catch{report.result='BLOCKED';report.reason='protected_readback_failed';}}
  if(rootId&&report.result!=='DONE'){
    try{if(report.attemptStarted&&!receipt?.cleanup)throw Error('cleanup_unproven');assertOwned(root,rootId);assertNoOverlap(inventory(root,{hashes:false}),Object.values(before));await fsp.rm(root,{recursive:true});report.cleanup=!fs.existsSync(root);}catch{report.cleanup=false;report.reason='rollback_preserved_unproven_ownership_or_cleanup';}
  }
  report.finalRootExists=fs.existsSync(root);report.freeBytes=fs.statfsSync(path.dirname(root)).bavail*fs.statfsSync(path.dirname(root)).bsize;
  console.log(JSON.stringify(report));
}
