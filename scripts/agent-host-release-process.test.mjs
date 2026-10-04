import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {acquireWriterLock,writerLockFilename} from './lib/agent-host-writer-lock.mjs';
import {beginReleaseWriterCheckpoint,sealReleaseWriterCheckpoint} from './lib/agent-host-release-writer-recovery.mjs';
import {prepareReleaseProcessScope,withReleaseProcessScope,runReleaseNativeProcess} from './lib/agent-host-release-process.mjs';
import {releaseStateFixture} from './fixtures/release-state.mjs';
import {createHash} from 'node:crypto';
import {inspectReleaseCheckout} from './lib/agent-host-release-github.mjs';
import releaseContract from './lib/agent-host-release-contract.cjs';

test('installed activity Node runtime keeps binary stdin and a closed native release receipt',
 {skip:process.platform!=='win32',timeout:90000},async()=>{
 const directory=mkdtempSync(path.join(os.tmpdir(),'roost-release-node-test-'));
 let writer,prepared,context;
 try{
  prepared=await prepareReleaseProcessScope({activityBrowser:true});writer=await acquireWriterLock(directory);
  const state=releaseStateFixture(directory),client={hostId:state.release.snapshot.hostId,agentId:state.release.snapshot.releaserAgentId};
  context=beginReleaseWriterCheckpoint({writerLock:writer,state,client});
  const bytes=Buffer.from([0,255,10]),expected=createHash('sha256').update(bytes).digest('hex');
  const script="const c=require('node:crypto');let b=[];process.stdin.on('data',v=>b.push(v));process.stdin.on('end',()=>process.stdout.write(c.createHash('sha256').update(Buffer.concat(b)).digest('hex')));";
  const out=await withReleaseProcessScope(prepared,context,()=>runReleaseNativeProcess('node',{argv:['-e',script],cwd:directory,input:bytes,durationMs:10000}));
  assert.equal(out.toString('utf8'),expected);assert.equal(sealReleaseWriterCheckpoint(context).nativeProcessesAbsent,true);
  const checkpoint=JSON.parse(readFileSync(path.join(directory,writerLockFilename))).releaseCheckpoint;
  assert.equal(checkpoint.children.length,1);assert.equal(checkpoint.children[0].state,'closed');
  assert.equal(checkpoint.children[0].receipt.activeProcesses,0);assert.equal(checkpoint.children[0].receipt.cleanup,true);
  assert.equal(checkpoint.children[0].receipt.jobClosed,true);assert.equal(checkpoint.children[0].receipt.resumed,true);
 }finally{
  if(context)sealReleaseWriterCheckpoint(context);await writer?.release();await prepared?.dispose();
  assert.equal(path.dirname(directory),os.tmpdir());assert(path.basename(directory).startsWith('roost-release-node-test-'));rmSync(directory,{recursive:true});
 }
});

test('activity runtime selection rejects a data-provided executable selector before setup',async()=>{
 await assert.rejects(prepareReleaseProcessScope({activityBrowser:'node'}),/release_child_ownership_unproven/);
});

test('Windows release checkout validates real commit, parent and tree inside owned Git Jobs',
 {skip:process.platform!=='win32',timeout:90000},async()=>{
 const directory=mkdtempSync(path.join(os.tmpdir(),'roost-release-checkout-test-'));
 const checkout=path.join(directory,'checkout');mkdirSync(checkout);
 let writer,prepared,context;
 try{
  const git=(...argv)=>execFileSync('git',argv,{cwd:checkout,windowsHide:true,encoding:'utf8',env:{...process.env,GIT_CONFIG_GLOBAL:'NUL',GIT_CONFIG_NOSYSTEM:'1'}}).trim();
  git('init','--initial-branch=main');git('config','user.name','Synthetic Test');git('config','user.email','fixture@example.test');
  writeFileSync(path.join(checkout,'version.txt'),'1');git('add','version.txt');git('commit','-m','Synthetic baseline');const base=git('rev-parse','HEAD'),baseTree=git('rev-parse','HEAD^{tree}');
  git('switch','-c','codex/certificate');writeFileSync(path.join(checkout,'version.txt'),'2');git('add','version.txt');git('commit','-m','Synthetic candidate');
  const commit=git('rev-parse','HEAD'),tree=git('rev-parse','HEAD^{tree}');git('remote','add','origin','https://github.com/example/certificate');
  const state=releaseStateFixture(checkout),s=state.release.snapshot;s.commit=commit;s.candidateTree=tree;s.baseCommit=base;s.baseTree=baseTree;s.manifest.baseline.commit=base;s.manifest.rollback.commit=base;
  s.manifestDigest=releaseContract.releaseDigest(s.manifest);state.release.manifestDigest=s.manifestDigest;
  prepared=await prepareReleaseProcessScope();writer=await acquireWriterLock(directory);
  context=beginReleaseWriterCheckpoint({writerLock:writer,state,client:{hostId:s.hostId,agentId:s.releaserAgentId}});
  const proof=await withReleaseProcessScope(prepared,context,()=>inspectReleaseCheckout(s.manifest,commit,base,tree));
  assert.deepEqual(proof,{commit,tree,baseCommit:base});sealReleaseWriterCheckpoint(context);
  const checkpoint=JSON.parse(readFileSync(path.join(directory,writerLockFilename))).releaseCheckpoint;
  assert.equal(checkpoint.registeredChildCount,6);assert(checkpoint.children.every(child=>child.state==='closed'&&child.receipt.cleanup&&child.receipt.activeProcesses===0));
 }catch(error){console.log(JSON.stringify({nativeCheckoutFailure:error.message,diagnostic:error.details?.reason}));throw error;}finally{
  if(context)sealReleaseWriterCheckpoint(context);
  await writer?.release();await prepared?.dispose();assert.equal(path.dirname(directory),os.tmpdir());assert(path.basename(directory).startsWith('roost-release-checkout-test-'));rmSync(directory,{recursive:true});
 }
});

test('real release Git child has a suspended native assignment and closed receipt before sealing',
 {skip:process.platform!=='win32'},async()=>{
 const directory=mkdtempSync(path.join(os.tmpdir(),'roost-release-process-test-'));
 let writer,prepared;
 try{
  prepared=await prepareReleaseProcessScope();writer=await acquireWriterLock(directory);
  const state=releaseStateFixture(directory),client={hostId:state.release.snapshot.hostId,agentId:state.release.snapshot.releaserAgentId};
  const context=beginReleaseWriterCheckpoint({writerLock:writer,state,client});
  const output=await withReleaseProcessScope(prepared,context,()=>runReleaseNativeProcess('git',{argv:['--version'],cwd:directory,input:Buffer.alloc(0),durationMs:10000}));
  assert.match(output.toString('utf8'),/^git version /);
  const bytes=Buffer.from([0,255,10]),expected=createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
  const blob=await withReleaseProcessScope(prepared,context,()=>runReleaseNativeProcess('git',{argv:['hash-object','--stdin'],cwd:directory,input:bytes,durationMs:10000}));
  assert.equal(blob.toString('utf8').trim(),expected,'binary object upload input must survive native Job transport');
  const engine=await withReleaseProcessScope(prepared,context,()=>runReleaseNativeProcess('docker',{argv:['info','--format','{{.ID}}'],cwd:directory,durationMs:10000}));
  assert(engine.toString('utf8').trim().length>0,'fixed Docker CLI reaches the existing engine with isolated environment');
  const ssh=await withReleaseProcessScope(prepared,context,()=>runReleaseNativeProcess('ssh',{argv:['-G','fixture.invalid'],cwd:directory,durationMs:10000}));
  assert.match(ssh.toString('utf8'),/^hostname fixture\.invalid$/m,'Windows OpenSSH resolves configuration without a network connection');
  const barrier=sealReleaseWriterCheckpoint(context);assert.equal(barrier.nativeProcessesAbsent,true);
  const checkpoint=JSON.parse(readFileSync(path.join(directory,writerLockFilename))).releaseCheckpoint;
  assert.equal(checkpoint.children.length,4);assert(checkpoint.children.every(child=>child.state==='closed'));
  assert.equal(checkpoint.children[0].receipt.resumed,true);assert.equal(checkpoint.children[0].receipt.activeProcesses,0);
  assert.equal(checkpoint.children[0].receipt.resumeReceipt,checkpoint.children[0].resumeDigest);
 }finally{
  await writer?.release();await prepared?.dispose();
  assert.equal(path.dirname(directory),os.tmpdir());assert(path.basename(directory).startsWith('roost-release-process-test-'));
  rmSync(directory,{recursive:true});
 }
});

test('native SSH configuration refusal stays a fixed failure and closes its owned Job without a connection',
 {skip:process.platform!=='win32'},async()=>{
 const directory=mkdtempSync(path.join(os.tmpdir(),'roost-release-ssh-error-test-'));
 let writer,prepared,context;
 try{
  prepared=await prepareReleaseProcessScope();writer=await acquireWriterLock(directory);
  const state=releaseStateFixture(directory),client={hostId:state.release.snapshot.hostId,agentId:state.release.snapshot.releaserAgentId};
  context=beginReleaseWriterCheckpoint({writerLock:writer,state,client});
  await assert.rejects(withReleaseProcessScope(prepared,context,()=>runReleaseNativeProcess('ssh',{
   argv:['-F',path.join(directory,'missing-fixture-config'),'-G','fixture.invalid'],cwd:directory,durationMs:10000
  })),error=>{
   assert.equal(error.message,'release_child_native_exit_failed');
   assert.deepEqual(error.details,{reason:'native_exit_failed'});return true;
  });
  assert.equal(sealReleaseWriterCheckpoint(context).nativeProcessesAbsent,true);
  const checkpoint=JSON.parse(readFileSync(path.join(directory,writerLockFilename))).releaseCheckpoint;
  assert.equal(checkpoint.registeredChildCount,1);assert.equal(checkpoint.children[0].state,'closed');
  assert.equal(checkpoint.children[0].receipt.jobClosed,true);assert.equal(checkpoint.children[0].receipt.activeProcesses,0);
 }finally{
  if(context)sealReleaseWriterCheckpoint(context);
  await writer?.release();await prepared?.dispose();
  assert.equal(path.dirname(directory),os.tmpdir());assert(path.basename(directory).startsWith('roost-release-ssh-error-test-'));
  rmSync(directory,{recursive:true});
 }
});
