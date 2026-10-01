import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {acquireWriterLock,writerLockFilename} from './lib/agent-host-writer-lock.mjs';
import {beginReleaseWriterCheckpoint,sealReleaseWriterCheckpoint} from './lib/agent-host-release-writer-recovery.mjs';
import {prepareReleaseProcessScope,withReleaseProcessScope,runReleaseNativeProcess} from './lib/agent-host-release-process.mjs';
import {releaseStateFixture} from './fixtures/release-state.mjs';
import {createHash} from 'node:crypto';

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
  const barrier=sealReleaseWriterCheckpoint(context);assert.equal(barrier.nativeProcessesAbsent,true);
  const checkpoint=JSON.parse(readFileSync(path.join(directory,writerLockFilename))).releaseCheckpoint;
  assert.equal(checkpoint.children.length,3);assert(checkpoint.children.every(child=>child.state==='closed'));
  assert.equal(checkpoint.children[0].receipt.resumed,true);assert.equal(checkpoint.children[0].receipt.activeProcesses,0);
  assert.equal(checkpoint.children[0].receipt.resumeReceipt,checkpoint.children[0].resumeDigest);
 }finally{
  await writer?.release();await prepared?.dispose();
  assert.equal(path.dirname(directory),os.tmpdir());assert(path.basename(directory).startsWith('roost-release-process-test-'));
  rmSync(directory,{recursive:true});
 }
});
