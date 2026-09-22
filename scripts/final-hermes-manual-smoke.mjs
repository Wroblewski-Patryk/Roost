// One newly authorized manual smoke of an already installed model. Never downloads.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {validateManualState,manualEnvironment,assertExpectedModel,fileIdentity} from './lib/hermes-manual-profile.mjs';
import {inventory,sha256,assertOwned,within} from './lib/hermes-manual-install.mjs';
import {buildWindowsJobLauncher,startWindowsJob} from './lib/hermes-manual-model-job.mjs';

const [stateArg,stateHash,rootArg]=process.argv.slice(2);
if(!stateArg||!rootArg||!stateHash)throw Error('arguments');
const statePath=path.resolve(stateArg),root=path.resolve(rootArg),exec=promisify(execFile);
const {state}=validateManualState(statePath,stateHash);
if(state.status!=='manual-smoke-blocked'||state.model.admitted!==false||fs.existsSync(root)
  ||[state.root.path,state.runtime.root,...state.protectedRoots,process.cwd()].some(p=>within(p,root)||within(root,p)))throw Error('smoke_scope');
const protectedBefore=state.protectedRoots.map(p=>inventory(p));
const runtimeBefore=inventory(state.runtime.root,{allowInternalLinks:true});
const profileBefore=inventory(state.root.path);
const store=path.join(process.env.USERPROFILE,'.ollama/models');
const manifestPath=path.join(store,'manifests/registry.ollama.ai/library/gpt-oss/20b');
const manifestBytes=fs.readFileSync(manifestPath),manifest=JSON.parse(manifestBytes);
if('sha256:'+sha256(manifestBytes)!==state.model.digest)throw Error('manifest_drift');
async function hashFile(file){const h=createHash('sha256');for await(const b of fs.createReadStream(file))h.update(b);return h.digest('hex');}
const blobs=[];
for(const item of [manifest.config,...manifest.layers]){
  const file=path.join(store,'blobs',item.digest.replace(':','-')),s=fs.lstatSync(file,{bigint:true});
  if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1n||Number(s.size)!==item.size||'sha256:'+await hashFile(file)!==item.digest)throw Error('blob_drift');
  blobs.push({file,digest:item.digest,identity:String(s.ino),mtime:String(s.mtimeNs),size:item.size});
}
const storeBefore=inventory(store,{hashes:false,maxBytes:20*1024**3});
if(storeBefore.files!==7)throw Error('store_inventory');
const ollama=path.join(process.env.LOCALAPPDATA,'Programs/Ollama/ollama.exe');
if(fileIdentity(ollama).sha256!=='ad41dcf55c5de96d4a0bff7c559a17285c3aa064a6f12d23db3ebf59ad8e4125')throw Error('ollama_binary_drift');
const nativeFacts=r=>({exitCode:r.rootExit,terminationReason:r.terminationReason,cleanup:r.cleanup,activeProcesses:r.activeProcesses});
let serverPid=0,smokePid=0,serverJob,serverResult,smokeJob,smokeResult,timer,sampling=false;
const script=name=>fileURLToPath(new URL(name,import.meta.url));
const freeDisk=()=>{const s=fs.statfsSync(store);return s.bavail*s.bsize;};
async function sample(){const r=await exec('powershell.exe',['-NoProfile','-NonInteractive','-File',script('./ollama-diagnostic-sample.ps1'),
  '-RootProcessId',String(serverPid),'-AdditionalRootProcessId',String(smokePid)],{windowsHide:true,timeout:15000,maxBuffer:131072});
  return {...JSON.parse(r.stdout),freeDiskBytes:freeDisk()};}
const meets=s=>s.availableBytes>=12*1024**3&&s.commitLimitBytes-s.committedBytes>=18*1024**3&&s.freeDiskBytes>=6*1024**3;
const api=(route,options={})=>fetch('http://127.0.0.1:11434'+route,{...options,redirect:'error',signal:AbortSignal.timeout(5000)});
const initial=await sample();
// A running installation requires a separate reuse contract; never stop or alter it.
if(initial.processes.length)throw Error('existing_server_not_owned');
try{await api('/api/version');throw Error('existing_listener');}catch(e){if(e.message==='existing_listener')throw e;}
fs.mkdirSync(root);const rootIdentity=String(fs.statSync(root,{bigint:true}).ino);
const control=path.join(root,'control');fs.mkdirSync(control);
const report={schema:'hermes-manual-final-smoke-v1',startedAt:new Date().toISOString(),result:'BLOCKED',attempts:0,
  model:{name:state.model.name,digest:state.model.digest,bytes:state.model.size},initial,resources:[],workerEvents:[],
  allBlobHashesVerified:true,stateBeforeSha256:stateHash,roostAuthority:false,loadOnlyRequests:0,downloads:0,
  minimum:{availableBytes:12*1024**3,commitHeadroomBytes:18*1024**3,diskBytes:6*1024**3},
  requestTimeoutSeconds:1800,smokeSafetyTimeoutSeconds:2100,serverSafetyTimeoutSeconds:2700};
const receiptPath=path.join(root,'final-smoke-receipt.json');
fs.writeFileSync(path.join(root,'attempt.json'),JSON.stringify({startedAt:report.startedAt,rootIdentity,maximumInferenceRequests:1})+'\n',{flag:'wx'});
async function takeSample(){if(sampling)return;sampling=true;try{
  const s=await sample();try{const r=await api('/api/ps');const b=await r.json();s.backend=b.models?.map(m=>({name:m.name,digest:m.digest,residentBytes:m.size,gpuBytes:m.size_vram,contextLength:m.context_length}));}catch{s.backendUnavailable=true;}
  report.resources.push(s);console.log(JSON.stringify({type:'resources',availableMiB:Math.round(s.availableBytes/1024**2),commitHeadroomMiB:Math.round((s.commitLimitBytes-s.committedBytes)/1024**2),processes:s.processes.length,gpuMiB:s.gpuMiB}));
}catch{report.sampleFailure=true;}finally{sampling=false;}}
try{
  if(!meets(initial))throw Error('resource_preflight');
  const check=await exec(process.execPath,[path.join(state.root.path,'control/hermes-manual-launcher.mjs'),statePath,stateHash,'--check'],{windowsHide:true,timeout:120000,maxBuffer:16384});
  report.launcherCheck=JSON.parse(check.stdout);if(report.launcherCheck.result!=='PASS')throw Error('launcher_check');
  const launcher=await buildWindowsJobLauncher(control);
  report.beforeServer=await sample();if(!meets(report.beforeServer))throw Error('resource_preflight');
  const environment={SystemRoot:process.env.SystemRoot,WINDIR:process.env.SystemRoot,OS:'Windows_NT',
    USERPROFILE:process.env.USERPROFILE,HOME:process.env.USERPROFILE,LOCALAPPDATA:process.env.LOCALAPPDATA,APPDATA:process.env.APPDATA,
    PATH:path.dirname(ollama)+';'+path.join(process.env.SystemRoot,'System32'),TEMP:process.env.TEMP,TMP:process.env.TEMP,
    OLLAMA_HOST:'127.0.0.1:11434',OLLAMA_MODELS:store,OLLAMA_CONTEXT_LENGTH:'2048',OLLAMA_NUM_PARALLEL:'1',
    OLLAMA_MAX_LOADED_MODELS:'1',OLLAMA_NO_CLOUD:'1',OLLAMA_KEEP_ALIVE:'5m',OLLAMA_LOAD_TIMEOUT:'30m',NO_PROXY:'127.0.0.1,localhost'};
  let pending='';
  serverJob=await startWindowsJob(launcher,{executable:process.execPath,argv:[script('./hermes-ollama-server-worker.mjs'),ollama,root],
    cwd:root,environment,input:'',durationMs:2700000,onData(channel,data){
      if(channel!=='stdout')throw Error('worker_stderr');pending+=data;
      for(let i;(i=pending.indexOf('\n'))>=0;){const row=JSON.parse(pending.slice(0,i));pending=pending.slice(i+1);
        if(row.type==='server_started')serverPid=row.pid;report.workerEvents.push({...row,observedAt:new Date().toISOString()});
        if(row.type!=='server_progress')console.log(JSON.stringify(row));}}});
  serverJob.completion.then(r=>{serverResult=r;},()=>{});
  let version;for(let i=0;i<30;i++){if(serverResult)throw Error('server_early_exit');try{version=await(await api('/api/version')).json();break;}catch{await delay(1000);}}
  if(version?.version!=='0.34.2')throw Error('server_version');
  const tags=await(await api('/api/tags')).json();assertExpectedModel(tags,state.model.digest);
  if(tags.models.length!==1)throw Error('unexpected_model');report.localEndpointVerified=true;
  report.beforeInference=await sample();if(!meets(report.beforeInference))throw Error('resource_preflight');
  report.attempts=1;report.inferenceStartedAt=new Date().toISOString();
  console.log(JSON.stringify({type:'smoke_started',minimumTimeoutMinutes:30,preflight:report.beforeInference}));
  let output='';
  smokeJob=await startWindowsJob(launcher,{executable:state.runtime.interpreter,
    argv:['-I','-S','-B',script('./hermes_manual_model_smoke.py')],cwd:path.join(state.root.path,'workspace'),
    environment:manualEnvironment(state),input:JSON.stringify({runtime:state.runtime.root,writable:state.root.path,fixture:false}),
    durationMs:2100000,onAssigned(e){smokePid=e.rootPid;},onData(channel,data){if(channel!=='stdout')throw Error('smoke_stderr');output+=data;if(output.length>16384)throw Error('smoke_metrics_budget');}});
  timer=setInterval(()=>{void takeSample();},5000);await takeSample();
  smokeResult=await smokeJob.completion;smokePid=0;report.smokeNative=nativeFacts(smokeResult);
  report.smoke=JSON.parse(output.trim());console.log(JSON.stringify({type:'smoke_result',...report.smoke,native:report.smokeNative}));
  clearInterval(timer);while(sampling)await delay(100);await takeSample();
  report.serverAliveAfter=!!(await(await api('/api/version')).json()).version;
  const resident=(await(await api('/api/ps')).json()).models?.find(m=>m.name===state.model.name);
  report.backend=resident?{residentBytes:resident.size,gpuBytes:resident.size_vram,contextLength:resident.context_length,
    digestMatches:resident.digest.replace(/^sha256:/,'')===state.model.digest.slice(7)}:null;
}catch(error){report.reason=/^[a-z_]+$/.test(error.message)?error.message:'smoke_operation_failed';}
finally{
  clearInterval(timer);while(sampling)await delay(100);
  if(smokeJob&&!smokeResult){smokeJob.stop('cancel');try{smokeResult=await smokeJob.completion;report.smokeNative=nativeFacts(smokeResult);}catch{report.smokeNative={cleanup:false};}}
  if(serverJob){
    if(!serverResult){report.controllerStopRequestedAt=new Date().toISOString();fs.writeFileSync(path.join(root,'stop-server'),'');
      const done=await Promise.race([serverJob.completion,delay(10000).then(()=>null)]);
      if(!done){report.controllerForcedCleanup=true;serverJob.stop('cancel');}}
    try{serverResult=await serverJob.completion;report.serverNative=nativeFacts(serverResult);}catch{report.serverNative={cleanup:false};}
  }
  const rawFile=path.join(root,'server-tail.private.json');
  if(fs.existsSync(rawFile)){const b=fs.readFileSync(rawFile),raw=JSON.parse(b);report.rawLog={bytes:b.length,sha256:sha256(b)};
    report.serverOutput={rawBytes:raw.rawBytes,oldLimitCrossings:raw.oldLimitCrossings};}
  report.serverExit=report.workerEvents.find(x=>x.type==='server_exit')??null;
  const stopped=(!serverJob||report.serverNative?.cleanup&&report.serverNative.activeProcesses===0)
    &&(!smokeJob||report.smokeNative?.cleanup&&report.smokeNative.activeProcesses===0);
  // Remove only new profile runtime artifacts, after owned process cleanup.
  if(stopped){
    const after=inventory(state.root.path),old=new Map(profileBefore.rows.map(r=>[r.path,r]));
    report.existingProfileFilesUnchanged=after.rows.every(r=>!old.has(r.path)||r.kind!=='file'||r.sha256===old.get(r.path).sha256);
    for(const row of after.rows.filter(r=>!old.has(r.path)).reverse()){
      const target=path.join(state.root.path,row.path);if(!within(state.root.path,target))throw Error('profile_cleanup_scope');
      if(row.kind==='file')fs.unlinkSync(target);else fs.rmdirSync(target);
    }
  }
  report.profileUnchanged=inventory(state.root.path).digest===profileBefore.digest;
  report.protectedUnchanged=state.protectedRoots.map(p=>inventory(p)).every((x,i)=>x.digest===protectedBefore[i].digest);
  report.runtimeUnchanged=inventory(state.runtime.root,{allowInternalLinks:true}).digest===runtimeBefore.digest;
  report.modelUnchanged=sha256(fs.readFileSync(manifestPath))===sha256(manifestBytes);
  for(const b of blobs){const s=fs.lstatSync(b.file,{bigint:true});report.modelUnchanged&&=String(s.ino)===b.identity&&String(s.mtimeNs)===b.mtime&&Number(s.size)===b.size&&'sha256:'+await hashFile(b.file)===b.digest;}
  report.storeUnchanged=inventory(store,{hashes:false,maxBytes:20*1024**3}).digest===storeBefore.digest;
  report.stateUnchangedBeforeAdmission=sha256(fs.readFileSync(statePath))===stateHash;
  serverPid=0;smokePid=0;report.finalResources=await sample();
  validateManualState(statePath,stateHash);
  const n=report.smokeNative,smoke=report.smoke;
  const passed=!report.reason&&!report.sampleFailure&&report.attempts===1&&smoke?.result==='PASS'&&smoke.inferenceRequests===1&&smoke.expectedResponse
    &&n?.exitCode===0&&n.terminationReason==='root_exit'&&stopped&&report.serverAliveAfter
    &&report.serverExit?.controllerStopRequested===true&&!report.controllerForcedCleanup
    &&report.serverNative?.exitCode===0&&report.serverNative.terminationReason==='root_exit'
    &&report.backend?.digestMatches&&report.backend.contextLength===2048&&report.finalResources.processes.length===0
    &&report.profileUnchanged&&report.protectedUnchanged&&report.runtimeUnchanged&&report.modelUnchanged&&report.storeUnchanged
    &&report.stateUnchangedBeforeAdmission&&report.launcherCheck?.result==='PASS';
  report.result=passed?'DONE':'BLOCKED';report.finishedAt=new Date().toISOString();
  if(stopped){assertOwned(root,rootIdentity);if(fs.realpathSync.native(control)!==control||!within(root,control))throw Error('control_scope');
    fs.rmSync(control,{recursive:true});fs.rmSync(path.join(root,'stop-server'),{force:true});report.temporaryControlRemoved=true;}
  fs.writeFileSync(receiptPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  const receiptHash=sha256(fs.readFileSync(receiptPath));
  if(passed){
    const batchPath=path.join(state.root.path,'Launch Hermes Manual.cmd'),batch=fs.readFileSync(batchPath,'utf8');
    if(batch.split(stateHash).length!==2)throw Error('launcher_state_binding');
    state.status='manual-ready';Object.assign(state.model,{status:'admitted',admitted:true,smokeCompleted:true,
      admissionScope:'manual-no-tools-local-exact-digest',smokeReceiptSha256:receiptHash,admittedAt:report.finishedAt});
    const bytes=JSON.stringify(state,null,2)+'\n',newHash=sha256(bytes);
    fs.writeFileSync(statePath,bytes);fs.writeFileSync(batchPath,batch.replace(stateHash,newHash));
    validateManualState(statePath,newHash);
    console.log(JSON.stringify({type:'manual_admitted',stateSha256:newHash,receiptSha256:receiptHash,roostAuthority:false}));
  }
  console.log(JSON.stringify({type:'final_smoke_complete',result:report.result,reason:report.reason,receiptSha256:receiptHash,
    serverNative:report.serverNative,smokeNative:report.smokeNative,serverExit:report.serverExit,backend:report.backend,
    profileUnchanged:report.profileUnchanged,protectedUnchanged:report.protectedUnchanged,runtimeUnchanged:report.runtimeUnchanged,
    modelUnchanged:report.modelUnchanged,storeUnchanged:report.storeUnchanged,rawLog:report.rawLog}));
}
