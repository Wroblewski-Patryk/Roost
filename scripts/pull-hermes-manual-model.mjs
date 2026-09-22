// Explicit point-3 operation. One pull; no Worker/provider admission.
import fs from 'node:fs';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {buildWindowsJobLauncher,startWindowsJob} from './lib/agent-host-windows-job.mjs';
import {inventory,sha256,assertOwned} from './lib/hermes-manual-install.mjs';
import {validateManualState,fileIdentity,checkFile} from './lib/hermes-manual-profile.mjs';

const [stateArg,stateHash,ollamaArg]=process.argv.slice(2);
const statePath=path.resolve(stateArg),ollama=path.resolve(ollamaArg);
const {state}=validateManualState(statePath,stateHash);
const store=path.join(process.env.USERPROFILE,'.ollama/models');
const control=path.join(state.root.path,'point3-control');
const report={schema:'hermes-manual-model-pull-v1',result:'BLOCKED',pullAttempts:0,serverStarted:false};
let server,pull,serverResult,rootId;
const protectedBefore=state.protectedRoots.map(p=>inventory(p));
const environment={SystemRoot:process.env.SystemRoot,WINDIR:process.env.SystemRoot,OS:'Windows_NT',
  USERPROFILE:process.env.USERPROFILE,HOME:process.env.USERPROFILE,LOCALAPPDATA:process.env.LOCALAPPDATA,
  APPDATA:process.env.APPDATA,PATH:path.dirname(ollama)+';'+path.join(process.env.SystemRoot,'System32'),
  TEMP:process.env.TEMP,TMP:process.env.TEMP,OLLAMA_HOST:'127.0.0.1:11434',OLLAMA_MODELS:store,
  OLLAMA_CONTEXT_LENGTH:'2048',OLLAMA_NUM_PARALLEL:'1',OLLAMA_MAX_LOADED_MODELS:'1',
  OLLAMA_NO_CLOUD:'1',OLLAMA_KEEP_ALIVE:'5m',NO_PROXY:'127.0.0.1,localhost'};
async function local(route,options={}){
  const res=await fetch('http://127.0.0.1:11434'+route,{...options,redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!res.ok)throw Error('ollama_http');return res.json();
}
function files(dir){const rows=[];function walk(p){for(const d of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,d.name);if(d.isSymbolicLink())throw Error('store_link');if(d.isDirectory())walk(f);else rows.push({path:path.relative(dir,f),size:fs.statSync(f).size});}}walk(dir);return rows;}
try{
  if(process.argv.length!==5||!fs.existsSync(store)||fs.realpathSync.native(store)!==store||fs.existsSync(control))throw Error('preflight_path');
  if(process.env.OLLAMA_MODELS&&path.resolve(process.env.OLLAMA_MODELS)!==store)throw Error('unexpected_store');
  const existing=files(store);report.storeBefore={files:existing.length,bytes:existing.reduce((n,r)=>n+r.size,0)};
  // This operation was authorized for the verified empty default store only.
  if(existing.length)throw Error('store_changed_since_preflight');
  try{await local('/api/version');throw Error('server_started_since_preflight');}catch(error){if(error.message==='server_started_since_preflight')throw error;}
  const metadata=await fetch('https://registry.ollama.ai/v2/library/gpt-oss/manifests/20b',{
    headers:{Accept:'application/vnd.docker.distribution.manifest.v2+json'},redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!metadata.ok)throw Error('registry_metadata');
  const manifestBytes=Buffer.from(await metadata.arrayBuffer()),manifest=JSON.parse(manifestBytes);
  const required=[manifest.config,...manifest.layers].reduce((n,l)=>n+l.size,0);
  const disk=fs.statfsSync(store),free=disk.bavail*disk.bsize;
  if(!Number.isSafeInteger(required)||required<=0||free-required<7*1024**3)throw Error('disk_reserve');
  report.registryManifestSha256=sha256(manifestBytes);report.expectedDownloadBytes=required;report.freeBefore=free;
  report.ollama=fileIdentity(ollama);
  fs.mkdirSync(control);rootId=String(fs.statSync(control,{bigint:true}).ino);
  fs.writeFileSync(path.join(control,'ownership.json'),JSON.stringify({identity:rootId,profileIdentity:state.root.identity})+'\n',{flag:'wx'});
  const launcher=await buildWindowsJobLauncher(control);
  let serverBytes=0;const serverFacts=[];
  server=await startWindowsJob(launcher,{executable:ollama,argv:['serve'],cwd:control,environment,input:'',durationMs:3600000,
    onData(channel,data){serverBytes+=data.length;const text=data.toString('utf8');
      // Fixed numeric engine evidence only; no raw paths/env/logs retained.
      for(const match of text.matchAll(/offloaded (\d+)\/(\d+) layers to GPU/g))serverFacts.push({offloadedLayers:+match[1],totalLayers:+match[2]});
    }});
  server.completion.then(r=>{serverResult=r;},()=>{});report.serverStarted=true;
  let version;
  for(let i=0;i<30;i++){if(serverResult)throw Error('server_early_exit');try{version=await local('/api/version');break;}catch{await delay(1000);}}
  if(version?.version!=='0.34.2')throw Error('server_version');report.serverVersion=version.version;
  if((await local('/api/tags')).models.length)throw Error('unexpected_models');
  fs.writeFileSync(path.join(control,'preflight.json'),JSON.stringify(report)+'\n',{flag:'wx'});
  console.log(JSON.stringify({type:'preflight_pass',serverVersion:version.version,expectedDownloadBytes:required,expectedFreeAfter:free-required}));
  checkFile(report.ollama);report.pullAttempts=1;
  const node=fileIdentity(fs.realpathSync.native(process.execPath));checkFile(node);
  const worker=fileURLToPath(new URL('./hermes-ollama-pull-worker.mjs',import.meta.url));
  pull=await startWindowsJob(launcher,{executable:node.path,argv:[worker,ollama],cwd:control,environment,input:'',durationMs:3500000,
    onData(channel,data){if(channel!=='stdout')throw Error('pull_worker_stderr');process.stdout.write(data);}});
  const pulled=await pull.completion;
  report.pull={exitCode:pulled.rootExit,cleanup:pulled.cleanup,activeProcesses:pulled.activeProcesses,terminationReason:pulled.terminationReason};
  if(pulled.rootExit!==0||pulled.terminationReason!=='root_exit'||!pulled.cleanup)throw Error('pull_failed');
  const tags=await local('/api/tags'),models=tags.models.filter(m=>m.name==='gpt-oss:20b');
  if(models.length!==1||tags.models.length!==1)throw Error('model_inventory');
  const item=models[0],localManifest=fs.readFileSync(path.join(store,'manifests/registry.ollama.ai/library/gpt-oss/20b'));
  if(sha256(localManifest)!==report.registryManifestSha256||item.digest.replace(/^sha256:/,'')!==sha256(localManifest))throw Error('model_identity');
  for(const layer of [manifest.config,...manifest.layers]){
    const blob=path.join(store,'blobs',layer.digest.replace(':','-'));
    if(!fs.existsSync(blob)||fs.statSync(blob).size!==layer.size)throw Error('model_blob_size');
  }
  const show=await local('/api/show',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-oss:20b'})});
  report.model={name:item.name,digest:item.digest,size:item.size,details:item.details,capabilities:show.capabilities};
  report.result='PULLED';report.freeAfterPull=fs.statfsSync(store).bavail*fs.statfsSync(store).bsize;
  if(report.freeAfterPull<6*1024**3)throw Error('post_pull_reserve');
  fs.writeFileSync(path.join(control,'pull-receipt.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({type:'pull_complete',model:report.model,freeBytes:report.freeAfterPull,serverHeldForSmoke:true}));
  // Same task will prepare/run one smoke, then explicitly signal completion.
  // The native Job remains owned by this live controller in the meantime.
  const finish=path.join(control,'finish');const deadline=Date.now()+25*60*1000;
  while(!fs.existsSync(finish)){if(serverResult)throw Error('server_ended_before_smoke');if(Date.now()>deadline)throw Error('smoke_handoff_timeout');await delay(1000);}
  report.result='PULL_AND_HANDOFF_COMPLETE';report.serverEngineFacts=serverFacts;report.serverLogBytes=serverBytes;
}catch(error){report.result='BLOCKED';report.reason=/^[a-z_]+$/.test(error.message)?error.message:'model_operation_failed';}
finally{
  if(server){server.stop('cancel');try{serverResult=await server.completion;report.serverCleanup={cleanup:serverResult.cleanup,activeProcesses:serverResult.activeProcesses};}catch{report.serverCleanup={cleanup:false};}}
  const after=state.protectedRoots.map(p=>inventory(p));report.protectedUnchanged=after.every((x,i)=>x.digest===protectedBefore[i].digest);
  report.storeAfter={files:files(store).length,bytes:files(store).reduce((n,r)=>n+r.size,0)};
  report.freeBytes=fs.statfsSync(store).bavail*fs.statfsSync(store).bsize;
  if(rootId){assertOwned(control,rootId);fs.writeFileSync(path.join(control,'operation-receipt.json'),JSON.stringify(report,null,2)+'\n');}
  console.log(JSON.stringify({type:'operation_end',...report,ollama:report.ollama?{sha256:report.ollama.sha256}:null}));
}
