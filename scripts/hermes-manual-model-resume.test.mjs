import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {admitPreviousPartial,validateRanges} from './lib/hermes-manual-model-resume.mjs';
import {sha256} from './lib/hermes-manual-install.mjs';
import * as manual from './lib/hermes-manual-model-job.mjs';
import * as managed from './lib/agent-host-windows-job.mjs';

test('resume accepts the recorded partial set and rejects receipt, inventory and range drift',()=>{
  const dir=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'manual-resume-fixture-'));
  try{
    const store=path.join(dir,'models');fs.mkdirSync(path.join(store,'blobs'),{recursive:true});
    const digest='sha256:'+'a'.repeat(64),prefix=digest.replace(':','-')+'-partial';
    const manifestBytes=Buffer.from(JSON.stringify({config:{digest:'sha256:'+'b'.repeat(64),size:1},layers:[{mediaType:'application/vnd.ollama.image.model',digest,size:160}]}));
    const parts=Array.from({length:16},(_,N)=>({N,Offset:N*10,Size:10,Completed:2}));
    fs.writeFileSync(path.join(store,'blobs',prefix),Buffer.alloc(160));
    for(const p of parts)fs.writeFileSync(path.join(store,'blobs',prefix+'-'+p.N),JSON.stringify(p));
    const logicalBytes=fs.readdirSync(path.join(store,'blobs')).reduce((n,f)=>n+fs.statSync(path.join(store,'blobs',f)).size,0);
    const receiptPath=path.join(dir,'receipt.json');
    fs.writeFileSync(receiptPath,JSON.stringify({schema:'hermes-manual-model-attempt-v1',recordedAt:new Date(Date.now()+1000).toISOString(),result:'BLOCKED',reason:'native_pull_output_limit',pullAttempts:1,model:{name:'gpt-oss:20b',installed:false,registryExpectedDigest:'sha256:'+sha256(manifestBytes)},partialStore:{retained:true,logicalBytes,reportedCompletedBytes:32}}));
    const args={store,receiptPath,receiptHash:sha256(fs.readFileSync(receiptPath)),manifestBytes};
    const result=admitPreviousPartial(args);assert.equal(result.files,17);assert.equal(result.completedBytes,32);
    assert.match(result.evidence,/not_historical_hashes/);assert.ok(result.rows.every(r=>/^[a-f0-9]{64}$/.test(r.sha256)));
    assert.throws(()=>admitPreviousPartial({...args,receiptHash:'0'.repeat(64)}),/previous_receipt_drift/);
    fs.writeFileSync(path.join(store,'foreign-model'),'x');assert.throws(()=>admitPreviousPartial(args),/unexpected_store_inventory/);
    fs.unlinkSync(path.join(store,'foreign-model'));
    const metadata=path.join(store,'blobs',prefix+'-0');fs.utimesSync(metadata,new Date(),new Date(Date.now()+5000));
    assert.throws(()=>admitPreviousPartial(args),/partial_changed_or_shared/);
    assert.throws(()=>validateRanges(parts.map((p,i)=>i===1?{...p,Offset:9}:p),160,32),/partial_ranges/);
    assert.throws(()=>validateRanges(parts,160,33),/partial_totals/);
  }finally{fs.rmSync(dir,{recursive:true});}
});

test('four-hour manual native Job remains outside managed capabilities and receipts',{skip:process.platform!=='win32'},async()=>{
  await manual.temporaryWindowsJobLauncher(async artifact=>{
    const options={executable:process.execPath,argv:['-e','process.stdout.write("ok")'],cwd:os.tmpdir(),environment:{SystemRoot:process.env.SystemRoot},input:'',durationMs:14400000};
    await assert.rejects(managed.startWindowsJob(artifact,options));
    let output='';const job=await manual.startWindowsJob(artifact,{...options,onData(channel,data){output+=data;}});
    const receipt=await job.completion;
    assert.equal(output,'ok');assert.equal(receipt.rootExit,0);assert.equal(receipt.cleanup,true);assert.equal(receipt.activeProcesses,0);
    assert.equal(manual.isWindowsJobReceipt(receipt),true);assert.equal(managed.isWindowsJobReceipt(receipt),false);
  });
});
