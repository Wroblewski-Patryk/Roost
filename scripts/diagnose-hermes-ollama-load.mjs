// One explicitly authorized load-only diagnostic. No Hermes or model download.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {setTimeout as delay} from 'node:timers/promises';import {fileURLToPath} from 'node:url';
import {validateManualState,fileIdentity} from './lib/hermes-manual-profile.mjs';
import {inventory,sha256,assertOwned,within} from './lib/hermes-manual-install.mjs';
import {buildWindowsJobLauncher,startWindowsJob} from './lib/hermes-manual-model-job.mjs';

const exec=promisify(execFile),[stateArg,stateHash,rootArg]=process.argv.slice(2);
const statePath=path.resolve(stateArg),root=path.resolve(rootArg);
const {state}=validateManualState(statePath,stateHash);
if(state.status!=='manual-smoke-blocked'||fs.existsSync(root)||within(state.root.path,root)||within(process.cwd(),root))throw Error('diagnostic_scope');
const protectedBefore=state.protectedRoots.map(p=>inventory(p)),profileBefore=inventory(state.root.path);
const store=path.join(process.env.USERPROFILE,'.ollama/models'),manifestPath=path.join(store,'manifests/registry.ollama.ai/library/gpt-oss/20b');
const manifestBytes=fs.readFileSync(manifestPath),manifest=JSON.parse(manifestBytes);
if('sha256:'+sha256(manifestBytes)!==state.model.digest)throw Error('model_manifest_drift');
async function hashFile(file){const hash=createHash('sha256');for await(const bytes of fs.createReadStream(file))hash.update(bytes);return hash.digest('hex');}
const modelBefore=[];
for(const item of [manifest.config,...manifest.layers]){
  const file=path.join(store,'blobs',item.digest.replace(':','-')),s=fs.lstatSync(file,{bigint:true});
  if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1n||Number(s.size)!==item.size||'sha256:'+await hashFile(file)!==item.digest)throw Error('model_blob_drift');
  modelBefore.push({file,identity:String(s.ino),mtime:String(s.mtimeNs),size:Number(s.size),digest:item.digest});
}
const storeBefore=inventory(store,{hashes:false,maxBytes:20*1024**3});
if(storeBefore.files!==7)throw Error('unexpected_store_inventory');
const sampleScript=fileURLToPath(new URL('./ollama-diagnostic-sample.ps1',import.meta.url));
let serverPid=0;
async function sample(){const r=await exec('powershell.exe',['-NoProfile','-NonInteractive','-File',sampleScript,'-RootProcessId',String(serverPid)],{windowsHide:true,timeout:15000,maxBuffer:65536});return JSON.parse(r.stdout);}
const initial=await sample();if(initial.processes.length)throw Error('existing_ollama_process');
try{await fetch('http://127.0.0.1:11434/api/version',{signal:AbortSignal.timeout(2000)});throw Error('existing_listener');}catch(e){if(e.message==='existing_listener')throw e;}
const free=fs.statfsSync(store).bavail*fs.statfsSync(store).bsize;if(free<6*1024**3)throw Error('disk_reserve');
const ollama=path.join(process.env.LOCALAPPDATA,'Programs/Ollama/ollama.exe'),identity=fileIdentity(ollama);
if(identity.sha256!=='ad41dcf55c5de96d4a0bff7c559a17285c3aa064a6f12d23db3ebf59ad8e4125')throw Error('ollama_binary_drift');
fs.mkdirSync(root);const rootIdentity=String(fs.statSync(root,{bigint:true}).ino);
const control=path.join(root,'control');fs.mkdirSync(control);
const report={schema:'hermes-ollama-load-diagnosis-v1',startedAt:new Date().toISOString(),result:'INCONCLUSIVE',attempts:0,
  modelDigest:state.model.digest,modelBytes:state.model.size,allBlobHashesVerified:true,manualStateSha256:stateHash,
  freeBefore:free,resources:[initial],workerEvents:[],loadOnly:true,hermesStarted:false,roostAuthority:false,
  loadTimeoutMs:1800000,serverStallTimeout:'30m',nativeSafetyTimeoutMs:2400000};
fs.writeFileSync(path.join(root,'attempt.json'),JSON.stringify({startedAt:report.startedAt,rootIdentity,attempts:1})+'\n',{flag:'wx'});
const environment={SystemRoot:process.env.SystemRoot,WINDIR:process.env.SystemRoot,OS:'Windows_NT',
  USERPROFILE:process.env.USERPROFILE,HOME:process.env.USERPROFILE,LOCALAPPDATA:process.env.LOCALAPPDATA,APPDATA:process.env.APPDATA,
  PATH:path.dirname(ollama)+';'+path.join(process.env.SystemRoot,'System32'),TEMP:process.env.TEMP,TMP:process.env.TEMP,
  OLLAMA_HOST:'127.0.0.1:11434',OLLAMA_MODELS:store,OLLAMA_CONTEXT_LENGTH:'2048',OLLAMA_NUM_PARALLEL:'1',
  OLLAMA_MAX_LOADED_MODELS:'1',OLLAMA_NO_CLOUD:'1',OLLAMA_KEEP_ALIVE:'5m',OLLAMA_LOAD_TIMEOUT:'30m',NO_PROXY:'127.0.0.1,localhost'};
let job,jobResult,sampling=false,timer;
const api=async(route,options={},timeout=5000)=>fetch('http://127.0.0.1:11434'+route,{...options,redirect:'error',signal:AbortSignal.timeout(timeout)});
async function takeSample(){if(sampling)return;sampling=true;try{const s=await sample();
  try{const r=await api('/api/ps');const json=await r.json();s.backend=json.models?.map(m=>({name:m.name,digest:m.digest,residentBytes:m.size,gpuBytes:m.size_vram,contextLength:m.context_length}));}catch{s.backendUnavailable=true;}
  report.resources.push(s);console.log(JSON.stringify({type:'resource_sample',availableMiB:Math.round(s.availableBytes/1024**2),committedMiB:Math.round(s.committedBytes/1024**2),processes:s.processes.length,gpuMiB:s.gpuMiB,loaded:s.backend?.length??0}));
}catch{report.sampleFailure=true;}finally{sampling=false;}}
try{
  const launcher=await buildWindowsJobLauncher(control);let pending='';
  job=await startWindowsJob(launcher,{executable:process.execPath,
    argv:[fileURLToPath(new URL('./hermes-ollama-server-worker.mjs',import.meta.url)),ollama,root],cwd:root,environment,input:'',durationMs:2400000,
    onData(channel,data){if(channel!=='stdout')throw Error('worker_stderr');pending+=data;for(let i;(i=pending.indexOf('\n'))>=0;){const row=JSON.parse(pending.slice(0,i));pending=pending.slice(i+1);if(row.type==='server_started')serverPid=row.pid;report.workerEvents.push({...row,observedAt:new Date().toISOString()});if(row.type!=='server_progress')console.log(JSON.stringify(row));}}});
  job.completion.then(r=>{jobResult=r;},()=>{});
  let version;for(let i=0;i<30;i++){if(jobResult)throw Error('server_early_exit');try{version=await(await api('/api/version')).json();break;}catch{await delay(1000);}}
  if(version?.version!=='0.34.2')throw Error('server_version');
  const tags=await(await api('/api/tags')).json();if(tags.models.length!==1||tags.models[0].digest.replace(/^sha256:/,'')!==state.model.digest.slice(7))throw Error('local_model_mismatch');
  await takeSample();timer=setInterval(()=>{void takeSample();},15000);
  report.attempts=1;report.requestStartedAt=new Date().toISOString();console.log(JSON.stringify({type:'load_only_started',timeoutMinutes:30}));
  const started=Date.now();
  try{
    const response=await api('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model:'gpt-oss:20b',prompt:'',stream:false,keep_alive:'5m',options:{num_ctx:2048}})},1800000);
    const body=await response.json();report.api={status:response.status,elapsedMs:Date.now()-started,done:body.done,doneReason:body.done_reason,
      generatedCharacters:(body.response??'').length,evalCount:body.eval_count??0,
      error:body.error?String(body.error).replace(/[A-Z]:[\\/][^\s"']+/gi,'[path]').slice(0,1000):null};
  }catch(error){report.api={elapsedMs:Date.now()-started,errorClass:error.name,errorCode:error.cause?.code??null};}
  await takeSample();
  try{report.serverAliveAfter=!!(await(await api('/api/version')).json()).version;}catch{report.serverAliveAfter=false;}
}catch(error){report.reason=/^[a-z_]+$/.test(error.message)?error.message:'diagnostic_operation_failed';}
finally{
  clearInterval(timer);while(sampling)await delay(100);
  if(job){
    if(!jobResult){report.controllerStopRequestedAt=new Date().toISOString();fs.writeFileSync(path.join(root,'stop-server'),'');
      const result=await Promise.race([job.completion,delay(10000).then(()=>null)]);
      if(!result){report.controllerForcedCleanup=true;job.stop('cancel');}}
    try{const r=await job.completion;report.native={exitCode:r.rootExit,terminationReason:r.terminationReason,cleanup:r.cleanup,activeProcesses:r.activeProcesses,stdoutBytes:r.stdoutBytes,stderrBytes:r.stderrBytes};}catch{report.native={cleanup:false};}
  }
  const rawFile=path.join(root,'server-tail.private.json');
  if(fs.existsSync(rawFile)){
    const bytes=fs.readFileSync(rawFile),raw=JSON.parse(bytes);report.rawLog={files:1,bytes:bytes.length,sha256:sha256(bytes)};
    report.serverOutput={rawBytes:raw.rawBytes,oldLimitCrossings:raw.oldLimitCrossings};
    const sanitize=text=>text.split(/\r?\n/).filter(line=>/out of memory|CUDA error|failed|error:|offload|buffer size|loaded|memory|required|available|runner started/i.test(line)&&!line.includes('server config')).slice(-35)
      .map(line=>line.replaceAll(process.env.USERPROFILE,'[home]').replace(/[A-Z]:[\\/][^\s"']+/gi,'[path]').replace(/(?:token|password|secret|api_key)\s*[:=]\s*\S+/gi,'[redacted]')).join('\n').slice(-12000);
    report.sanitizedTail={stdout:sanitize(raw.stdout),stderr:sanitize(raw.stderr)};
  }
  report.finishedAt=new Date().toISOString();
  report.profileUnchanged=inventory(state.root.path).digest===profileBefore.digest;
  report.protectedUnchanged=state.protectedRoots.map(p=>inventory(p)).every((x,i)=>x.digest===protectedBefore[i].digest);
  report.modelFilesUnchanged=modelBefore.every(r=>{const s=fs.lstatSync(r.file,{bigint:true});return String(s.ino)===r.identity&&String(s.mtimeNs)===r.mtime&&Number(s.size)===r.size;})&&sha256(fs.readFileSync(manifestPath))===sha256(manifestBytes);
  report.storeInventoryUnchanged=inventory(store,{hashes:false,maxBytes:20*1024**3}).digest===storeBefore.digest;
  report.manualStateUnchanged=sha256(fs.readFileSync(statePath))===stateHash;
  serverPid=0;report.finalResources=await sample();report.freeAfter=fs.statfsSync(store).bavail*fs.statfsSync(store).bsize;
  if(report.native?.cleanup&&report.native.activeProcesses===0){assertOwned(root,rootIdentity);
    if(fs.realpathSync.native(control)!==control||!within(root,control))throw Error('control_cleanup_scope');
    fs.rmSync(control,{recursive:true});fs.rmSync(path.join(root,'stop-server'),{force:true});}
  fs.writeFileSync(path.join(root,'diagnosis-receipt.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({type:'diagnostic_complete',api:report.api,serverAliveAfter:report.serverAliveAfter,serverOutput:report.serverOutput,
    serverExit:report.workerEvents.find(e=>e.type==='server_exit'),native:report.native,profileUnchanged:report.profileUnchanged,
    protectedUnchanged:report.protectedUnchanged,modelFilesUnchanged:report.modelFilesUnchanged,storeInventoryUnchanged:report.storeInventoryUnchanged,
    manualStateUnchanged:report.manualStateUnchanged,freeAfter:report.freeAfter,rawLog:report.rawLog}));
}
