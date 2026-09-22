// Explicit one-shot owner action; no model/API/provider execution.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildWindowsJobLauncher,startWindowsJob} from './lib/agent-host-windows-job.mjs';
import {assertNewRoot,assertOwned,inventory,assertNoOverlap,sha256} from './lib/hermes-manual-install.mjs';
import {schema,model,endpoint,configBytes,fileIdentity,readInstallation,manualEnvironment,validateManualState} from './lib/hermes-manual-profile.mjs';

const scriptDir=path.dirname(fileURLToPath(import.meta.url));
const [receiptArg,receiptSha256,rootArg]=process.argv.slice(2);
const receiptPath=receiptArg?path.resolve(receiptArg):'',root=rootArg?path.resolve(rootArg):'';
const report={result:'BLOCKED',profileCreated:false,providerStarted:false,modelQueried:false};
let owned,before,lastJob,tools,state,probeStarted=false;
const manifest=JSON.parse(fs.readFileSync(path.join(process.env.LOCALAPPDATA,'hermes/roost-worker-manifest.json'),'utf8'));
const protectedRoots=[fs.realpathSync.native(manifest.roots[0].path),fs.realpathSync.native(path.join(process.env.LOCALAPPDATA,'Roost/hermes-pilot'))];
try {
  if(process.platform!=='win32'||process.argv.length!==5||!path.isAbsolute(receiptPath)||!path.isAbsolute(root))throw Error('arguments');
  const installation=readInstallation(receiptPath,receiptSha256);
  const runtime=installation.receipt;
  const denied=[process.cwd(),path.dirname(receiptPath),...protectedRoots];
  assertNewRoot(root,denied);
  before=protectedRoots.map(p=>inventory(p));
  assertNoOverlap(installation.current,before);
  fs.mkdirSync(root);owned=String(fs.statSync(root,{bigint:true}).ino);
  for(const name of ['hermes-manual','desktop-state','workspace','local','roaming','temp','control','control/lib'])fs.mkdirSync(path.join(root,name));
  fs.writeFileSync(path.join(root,'hermes-manual/config.yaml'),configBytes(),{flag:'wx'});
  fs.writeFileSync(path.join(root,'empty.gitconfig'),'',{flag:'wx'});
  const copied=['hermes-manual-launcher.mjs','lib/hermes-manual-profile.mjs','lib/hermes-manual-install.mjs'];
  for(const name of copied)fs.copyFileSync(path.join(scriptDir,name),path.join(root,'control',name),fs.constants.COPYFILE_EXCL);
  const dir=target=>({path:target,identity:String(fs.statSync(target,{bigint:true}).ino)});
  state={schema,profile:'hermes-manual',status:'model_pending_not_admitted',roostAuthority:false,
    root:dir(root),home:dir(path.join(root,'hermes-manual')),desktopState:dir(path.join(root,'desktop-state')),
    runtime:{root:runtime.root,executable:runtime.executable,interpreter:runtime.interpreter,receipt:receiptPath,receiptSha256,
      sourcePin:runtime.sourcePin,version:runtime.version,inventoryDigest:runtime.inventoryDigest},
    model:{name:model,endpoint,status:'pending',admitted:false,digest:null,presence:'not_queried'},
    protectedRoots,node:fileIdentity(fs.realpathSync.native(process.execPath)),systemRoot:process.env.SystemRoot,
    bundle:[...copied.map(n=>fileIdentity(path.join(root,'control',n))),fileIdentity(path.join(root,'empty.gitconfig'))]};
  const env=manualEnvironment(state);
  tools=path.join(root,'validation-tools');fs.mkdirSync(tools);
  const launcher=await buildWindowsJobLauncher(tools);
  async function probe(executable,argv,input,durationMs){
    let stdout='',stderr='';lastJob=null;probeStarted=true;
    const child=await startWindowsJob(launcher,{executable,argv,input,durationMs,cwd:path.join(root,'workspace'),environment:env,
      onData(channel,data){if(channel==='stdout')stdout+=data.toString('utf8');else stderr+=data.toString('utf8');}});
    lastJob=await child.completion;
    if(lastJob.rootExit!==0||!lastJob.cleanup||lastJob.activeProcesses!==0||lastJob.terminationReason!=='root_exit'){
      report.failedProbe={exitCode:lastJob.rootExit,cleanup:lastJob.cleanup,stdoutBytes:Buffer.byteLength(stdout),stderrBytes:Buffer.byteLength(stderr)};
      try{const parsed=JSON.parse(stdout);if(parsed.result==='BLOCKED'&&/^[A-Za-z]+$/.test(parsed.errorClass))report.failedProbe.errorClass=parsed.errorClass;}catch{}
      throw Error('offline_probe_failed');
    }
    return {stdout,stderr};
  }
  const configProbe=await probe(runtime.interpreter,['-I','-S','-B',path.join(scriptDir,'hermes_manual_profile_probe.py')],
    JSON.stringify({runtime:runtime.root,home:state.home.path}),15000);
  report.validation=JSON.parse(configProbe.stdout);
  if(configProbe.stderr||report.validation.result!=='PASS')throw Error('config_probe_failed');
  // Version only: no chat/UI/help tree/provider/API/model; upstream passive check
  // is disabled by the exact profile config just validated.
  const version=await probe(runtime.executable,['--version'],'',30000);
  if(!/Hermes.*\bv?0\.21\.3\b/.test(version.stdout)||version.stderr)throw Error('version_probe_failed');
  report.versionSmoke={exitCode:0,cleanup:true,activeProcesses:0,stdoutBytes:Buffer.byteLength(version.stdout),stdoutSha256:sha256(version.stdout)};
  assertOwned(root,owned);inventory(root);fs.rmSync(tools,{recursive:true});tools=null;
  state.validation=report.validation;state.versionSmoke=report.versionSmoke;
  const statePath=path.join(root,'MANUAL_DESKTOP_STATE.json'),bytes=Buffer.from(JSON.stringify(state,null,2)+'\n');
  fs.writeFileSync(statePath,bytes,{flag:'wx'});const stateHash=sha256(bytes);
  // Batch is private per installation, pins Node/script/state, clears Node's own
  // inherited preload controls and never forwards user arguments.
  for(const p of [state.node.path,root])if(/[\r\n%"!&|<>^]/.test(p))throw Error('launcher_path');
  const command=`@echo off\r\nsetlocal\r\nset "NODE_OPTIONS="\r\nset "NODE_PATH="\r\nset "NODE_USE_ENV_PROXY="\r\nset "HTTP_PROXY="\r\nset "HTTPS_PROXY="\r\nset "ALL_PROXY="\r\nset "NO_PROXY=127.0.0.1,localhost"\r\n"${state.node.path}" "${path.join(root,'control/hermes-manual-launcher.mjs')}" "${statePath}" "${stateHash}"\r\nif errorlevel 1 pause\r\n`;
  fs.writeFileSync(path.join(root,'Launch Hermes Manual.cmd'),command,{flag:'wx'});
  fs.writeFileSync(path.join(root,'README.txt'),
    'Hermes manual — profil hermes-manual\r\nUruchom: Launch Hermes Manual.cmd\r\nModel gpt-oss:20b: PENDING / NOT ADMITTED. Wymagany PUNKT 3: osobno zatwierdzone pobranie do jednego store i manualny smoke.\r\nLauncher teraz odmowi bez odpytania Ollama, pobierania lub uruchamiania modelu.\r\nTen launcher jest dla manualnego CLI; nie uruchamia Electron Desktop.\r\nBrak narzedzi shell/filesystem/repo, fallbackow, kluczy i uprawnien Roost.\r\nNie edytuj receipt/config ani nie obchodz launchera; zmiany wymagaja ponownej walidacji.\r\n',{flag:'wx'});
  validateManualState(statePath,stateHash);
  const afterRuntime=inventory(runtime.root,{allowInternalLinks:true});
  if(afterRuntime.digest!==runtime.inventoryDigest)throw Error('runtime_changed');
  report.result='DONE';report.profileCreated=true;report.stateSha256=stateHash;report.profileFiles=inventory(root).files;
  report.runtimeUnchanged=true;report.readyForPoint3=true;
}catch(error){report.reason=/^[a-z_0-9]+$/.test(error.message)?error.message:'profile_failed';}
finally{
  if(before){
    const after=protectedRoots.map(p=>inventory(p));report.protectedUnchanged=after.every((v,i)=>v.digest===before[i].digest);
    report.protectedCounts=after.map(v=>({files:v.files,bytes:v.bytes}));
    if(!report.protectedUnchanged){report.result='BLOCKED';report.reason='protected_changed';}
  }
  if(owned&&report.result!=='DONE'){
    try{if(probeStarted&&!lastJob?.cleanup)throw Error('cleanup_unproven');assertOwned(root,owned);assertNoOverlap(inventory(root),before);fs.rmSync(root,{recursive:true});report.rollback=true;}
    catch{report.rollback=false;}
  }
  console.log(JSON.stringify(report));if(report.result!=='DONE')process.exitCode=1;
}
