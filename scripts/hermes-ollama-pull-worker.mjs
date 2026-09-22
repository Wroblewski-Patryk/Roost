// Filter noisy CLI terminal repainting before the bounded native Job transport.
// One fixed pull only. No retry, raw log file or unbounded retained buffer.
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export function progressFilter(emit,now=Date.now){
  let bytes=0,percent=0,last=-Infinity,tail='';const errors=new Set();
  function consume(chunk){
    bytes+=chunk.length;tail=(tail+chunk.toString('utf8')).slice(-4096);
    const matches=[...tail.matchAll(/(\d{1,3})%/g)];if(matches.length)percent=Math.max(percent,Math.min(100,+matches.at(-1)[1]));
    for(const [name,pattern] of Object.entries({disk_full:/no space left|not enough space/i,tls:/certificate|tls handshake/i,
      unavailable:/connection refused|connection reset|timed out/i,not_found:/manifest.*not found/i}))if(pattern.test(tail))errors.add(name);
    if(now()-last>=30000){last=now();emit({type:'pull_progress',percent});}
  }
  return {consume,finish:()=>({type:'pull_output_summary',bytes,percent,classifications:[...errors].sort()})};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const executable=process.argv[2];
  if(process.argv.length!==3||!path.isAbsolute(executable))throw Error('pull_worker_arguments');
  const filter=progressFilter(value=>console.log(JSON.stringify(value)));
  const child=spawn(executable,['pull','gpt-oss:20b'],{cwd:process.cwd(),env:process.env,windowsHide:true,shell:false,
    stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',filter.consume);child.stderr.on('data',filter.consume);
  child.on('error',()=>{process.exitCode=1;});
  child.on('close',code=>{console.log(JSON.stringify(filter.finish()));process.exitCode=code??1;});
}
