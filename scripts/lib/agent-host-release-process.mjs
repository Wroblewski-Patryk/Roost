import { AsyncLocalStorage } from 'node:async_hooks';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, realpath } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildWindowsJobLauncher, startWindowsJob, isWindowsJobCleanupReceipt } from './agent-host-windows-job.mjs';
import { reserveReleaseChild, bindReleaseChild, recordReleaseChildReceipt } from './agent-host-release-writer-recovery.mjs';

const scopes=new AsyncLocalStorage();
const fail=()=>{throw Object.assign(Error('release_child_ownership_unproven'),{releaseBlocked:true,retryable:false});};
export const minimalReleaseEnvironment=()=>({PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,TEMP:process.env.TEMP,TMP:process.env.TMP});
export const hasReleaseProcessScope=()=>!!scopes.getStore();

// Resolve/build before publishing a release checkpoint. These are fixed native
// utilities, and cannot perform a repository or external release mutation.
export async function prepareReleaseProcessScope(){
 if(process.platform!=='win32')fail();
 const executables={};
 for(const kind of ['git','ssh','docker']){
  const r=spawnSync('where.exe',[kind+'.exe'],{env:minimalReleaseEnvironment(),windowsHide:true,encoding:'utf8',timeout:5000,maxBuffer:32768});
  const executable=r.status===0?r.stdout.trim().split(/\r?\n/)[0]:null;
  if(!executable||!path.isAbsolute(executable))fail();executables[kind]=executable;
 }
 const parent=await realpath(os.tmpdir()),directories=[];
 const allocate=async()=>{const directory=await mkdtemp(path.join(parent,'roost-release-job-'));directories.push(directory);return directory;};
 const artifact=await buildWindowsJobLauncher(await allocate());
 let disposed=false;
 return {artifact,executables,allocate,async dispose(){
  if(disposed)return;disposed=true;
  for(const directory of directories){
   if(path.dirname(directory)!==parent||!path.basename(directory).startsWith('roost-release-job-')||await realpath(directory)!==directory)fail();
   await rm(directory,{recursive:true,force:false});
  }
 }};
}

export async function withReleaseProcessScope(prepared,context,run){
 const scope={...prepared,context,builtAt:performance.now()};
 return scopes.run(scope,run);
}

async function ownedChild(scope,executable,{argv,cwd,environment=minimalReleaseEnvironment(),input='',durationMs=15000,maxBytes=131072}){
 const token=reserveReleaseChild(scope.context,{artifact:scope.artifact,executable});
 const chunks=[];let bytes=0,job;
 try{
  job=await startWindowsJob(scope.artifact,{executable,argv,cwd,environment,input,durationMs,attempt:token.attemptId,
   confirmResume:event=>bindReleaseChild(token,event),
   onData:(channel,chunk)=>{if(channel==='stdout'){bytes+=chunk.length;if(bytes>maxBytes)fail();chunks.push(chunk);}}});
  const receipt=await job.completion;
  recordReleaseChildReceipt(token,receipt);
  if(receipt.rootExit!==0||receipt.terminationReason!=='root_exit')fail();
  return Buffer.concat(chunks);
 }catch(error){
  if(isWindowsJobCleanupReceipt(error.details?.ownedTreeReceipt))recordReleaseChildReceipt(token,error.details.ownedTreeReceipt);
  throw Object.assign(Error('release_child_failed'),{releaseBlocked:true,retryable:false});
 }
}

export async function runReleaseNativeProcess(kind,options){
 const scope=scopes.getStore();if(!scope||!Object.hasOwn(scope.executables,kind))fail();
 // Refresh before the capability's sixty-second deadline. The compiler and all
 // descendants are themselves owned and recorded by the previous native Job.
 if(performance.now()-scope.builtAt>35000){
  const next=await buildWindowsJobLauncher(await scope.allocate(),{compile:(executable,argv)=>ownedChild(scope,executable,
   {argv,cwd:os.tmpdir(),durationMs:20000,maxBytes:65536})});
  scope.artifact=next;scope.builtAt=performance.now();
 }
 return ownedChild(scope,scope.executables[kind],options);
}
