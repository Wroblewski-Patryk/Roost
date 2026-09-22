// One manual-only Hermes model smoke. Fixture mode has no network/model access.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildWindowsJobLauncher,startWindowsJob} from './lib/hermes-manual-model-job.mjs';
import {validateManualState,manualEnvironment,assertExpectedModel,configBytes} from './lib/hermes-manual-profile.mjs';
import {inventory,assertOwned,within} from './lib/hermes-manual-install.mjs';

const [statePath,stateHash,mode]=process.argv.slice(2);
if(!['fixture','live'].includes(mode))throw Error('smoke_mode');
const {state}=validateManualState(path.resolve(statePath),stateHash);
const control=path.join(state.root.path,'point3-control');
const fixture=mode==='fixture';
const owned=path.join(control,fixture?'smoke-fixture':'smoke-live');
if(!within(state.root.path,owned)||fs.existsSync(owned))throw Error('smoke_path');
if(!fixture){
  if(state.model.status!=='admitted-for-manual-smoke'||state.model.admitted!==false)throw Error('smoke_admission');
  const receipt=JSON.parse(fs.readFileSync(path.join(control,'pull-receipt.json')));
  if(receipt.result!=='PULLED'||receipt.model.digest.replace(/^sha256:/,'')!==state.model.digest.replace(/^sha256:/,''))throw Error('pull_receipt');
  const response=await fetch('http://127.0.0.1:11434/api/tags',{redirect:'error',signal:AbortSignal.timeout(5000)});
  assertExpectedModel(await response.json(),state.model.digest);
  fs.writeFileSync(path.join(state.root.path,'MANUAL_MODEL_SMOKE_ATTEMPT.json'),JSON.stringify({schema:'hermes-manual-smoke-attempt-v1',startedAt:new Date().toISOString(),attempts:1})+'\n',{flag:'wx'});
}
fs.mkdirSync(owned);const identity=String(fs.statSync(owned,{bigint:true}).ino);
const protectedBefore=state.protectedRoots.map(p=>inventory(p));
const before=inventory(state.home.path);
let report,nativeReceipt;
try{
  const environment=manualEnvironment(state);
  if(fixture){
    for(const dir of ['home','desktop','local','roaming','temp','workspace'])fs.mkdirSync(path.join(owned,dir));
    const home=path.join(owned,'home');
    Object.assign(environment,{HOME:home,USERPROFILE:home,HOMEPATH:home.slice(2),HERMES_HOME:home,
      HERMES_DESKTOP_USER_DATA_DIR:path.join(owned,'desktop'),LOCALAPPDATA:path.join(owned,'local'),APPDATA:path.join(owned,'roaming'),TEMP:path.join(owned,'temp'),TMP:path.join(owned,'temp')});
    fs.writeFileSync(path.join(home,'config.yaml'),configBytes());
  }
  const launcher=await buildWindowsJobLauncher(owned);let output='';
  const child=await startWindowsJob(launcher,{executable:state.runtime.interpreter,
    argv:['-I','-S','-B',fileURLToPath(new URL('./hermes_manual_model_smoke.py',import.meta.url))],
    cwd:fixture?path.join(owned,'workspace'):path.join(state.root.path,'workspace'),environment,
    input:JSON.stringify({runtime:state.runtime.root,writable:fixture?owned:state.root.path,fixture}),durationMs:600000,
    onData(channel,data){if(channel!=='stdout')throw Error('unexpected_smoke_stderr');output+=data;if(output.length>16384)throw Error('smoke_output_budget');}});
  const native=await child.completion;nativeReceipt=native;
  report={schema:'hermes-manual-model-smoke-v1',recordedAt:new Date().toISOString(),...JSON.parse(output.trim()),
    native:{exitCode:native.rootExit,cleanup:native.cleanup,activeProcesses:native.activeProcesses,terminationReason:native.terminationReason}};
  if(native.rootExit!==0||native.terminationReason!=='root_exit')report.result='BLOCKED';
  if(!fixture){
    const response=await fetch('http://127.0.0.1:11434/api/ps',{redirect:'error',signal:AbortSignal.timeout(5000)});
    const resident=(await response.json()).models?.find(m=>m.name==='gpt-oss:20b');
    if(resident){
      report.backend={residentBytes:resident.size,gpuBytes:resident.size_vram,contextLength:resident.context_length,
        processor:resident.size_vram===0?'CPU':resident.size_vram<resident.size?'CPU+GPU':'GPU',
        digestMatches:resident.digest.replace(/^sha256:/,'')===state.model.digest.replace(/^sha256:/,'')};
      if(!report.backend.digestMatches||resident.context_length>2048)report.result='BLOCKED';
    }else report.backend={processor:'not_resident'};
  }
}catch(error){
  report??={schema:'hermes-manual-model-smoke-v1',recordedAt:new Date().toISOString(),fixture};
  report.result='BLOCKED';
  report.reason=nativeReceipt?.terminationReason==='timeout'?'smoke_timeout':/^[a-z_]+$/.test(error.message)?error.message:'smoke_operation_failed';
  if(nativeReceipt)report.native={exitCode:nativeReceipt.rootExit,cleanup:nativeReceipt.cleanup,
    activeProcesses:nativeReceipt.activeProcesses,terminationReason:nativeReceipt.terminationReason};
}finally{
  if(!nativeReceipt?.cleanup||nativeReceipt.activeProcesses!==0)throw Error('smoke_cleanup_unproven');
  // New private smoke logs/cache only; never erase pre-existing profile content.
  const after=inventory(state.home.path),old=new Map(before.rows.map(r=>[r.path,r]));
  const changed=after.rows.filter(r=>old.has(r.path)&&r.kind==='file'&&r.sha256!==old.get(r.path).sha256);
  if(changed.length)throw Error('existing_profile_content_changed');
  for(const row of after.rows.filter(r=>!old.has(r.path)).reverse()){
    const target=path.join(state.home.path,row.path);
    if(!within(state.home.path,target))throw Error('smoke_cleanup_scope');
    if(row.kind==='file')fs.unlinkSync(target);else fs.rmdirSync(target);
  }
  assertOwned(owned,identity);fs.rmSync(owned,{recursive:true});
  const protectedAfter=state.protectedRoots.map(p=>inventory(p));
  if(report){
    report.protectedUnchanged=protectedAfter.every((x,i)=>x.digest===protectedBefore[i].digest);
    report.profileContentUnchanged=inventory(state.home.path).digest===before.digest;
    if(!report.protectedUnchanged||!report.profileContentUnchanged)report.result='BLOCKED';
    if(!fixture)fs.writeFileSync(path.join(state.root.path,'MANUAL_MODEL_SMOKE_RECEIPT.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify(report));
  }
}
