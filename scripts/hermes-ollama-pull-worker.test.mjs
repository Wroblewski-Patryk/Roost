import test from 'node:test';
import assert from 'node:assert/strict';
import {progressFilter} from './hermes-ollama-pull-worker.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {temporaryWindowsJobLauncher,startWindowsJob} from './lib/agent-host-windows-job.mjs';

test('large ANSI progress stream stays below native output budgets without retaining raw content',()=>{
  let now=0;const emitted=[];const filter=progressFilter(x=>emitted.push(x),()=>now);
  const frame=Buffer.from('\x1b[?2026hpulling private/path 42% '+'.'.repeat(180)+'\x1b[?2026l');
  for(let i=0;i<100000;i++){now+=100;filter.consume(frame);}
  const summary=filter.finish();emitted.push(summary);
  assert.equal(summary.bytes,frame.length*100000);assert.equal(summary.percent,42);
  const output=emitted.map(x=>JSON.stringify(x)).join('\n');
  assert.ok(Buffer.byteLength(output)<32768);assert.doesNotMatch(output,/private|\x1b/);
});
test('progress failures retain only fixed classifications, never URLs or error text',()=>{
  const filter=progressFilter(()=>{},()=>0);filter.consume(Buffer.from('connection refused https://private.example/token=redacted'));
  assert.deepEqual(filter.finish().classifications,['unavailable']);assert.doesNotMatch(JSON.stringify(filter.finish()),/example|token/);
});
test('real native Job sees only bounded progress while descendant emits megabytes',{skip:process.platform!=='win32'},async()=>{
  const dir=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'model-progress-fixture-'));
  try{
    // The worker's fixed argv becomes `node pull gpt-oss:20b` in this fixture.
    // No Ollama, model store or network endpoint participates.
    fs.writeFileSync(path.join(dir,'pull'),"for(let i=0;i<30000;i++)process.stderr.write('\\x1b[?2026h50% '+'.'.repeat(180)+'\\x1b[?2026l');\n");
    await temporaryWindowsJobLauncher(async launcher=>{
      let text='';const child=await startWindowsJob(launcher,{executable:process.execPath,
        argv:[fileURLToPath(new URL('./hermes-ollama-pull-worker.mjs',import.meta.url)),process.execPath],cwd:dir,
        environment:{SystemRoot:process.env.SystemRoot,WINDIR:process.env.SystemRoot,TEMP:dir,TMP:dir},input:'',durationMs:15000,
        onData(channel,data){assert.equal(channel,'stdout');text+=data;}});
      const receipt=await child.completion;assert.equal(receipt.rootExit,0);assert.equal(receipt.cleanup,true);assert.equal(receipt.activeProcesses,0);
      assert.ok(Buffer.byteLength(text)<1024);const result=JSON.parse(text.trim().split('\n').at(-1));assert.ok(result.bytes>5*1024*1024);
    });
  }finally{fs.rmSync(dir,{recursive:true});}
});
