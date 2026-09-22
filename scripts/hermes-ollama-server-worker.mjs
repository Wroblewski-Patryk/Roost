// Drain server output before the bounded native Job. Log volume never stops it.
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

export function serverCapture(limit=65536){
  const counts={stdout:0,stderr:0},tails={stdout:Buffer.alloc(0),stderr:Buffer.alloc(0)},crossings={};
  const started=Date.now();
  return {
    consume(channel,chunk){
      counts[channel]+=chunk.length;
      tails[channel]=Buffer.concat([tails[channel],chunk]).subarray(-limit);
      const oldLimit=channel==='stdout'?131072:32768;
      if(counts[channel]>oldLimit&&!crossings[channel])crossings[channel]={afterMs:Date.now()-started,bytes:counts[channel],oldLimit};
    },
    metrics(){return {rawBytes:{...counts},oldLimitCrossings:{...crossings}};},
    raw(){return {stdout:tails.stdout.toString('utf8'),stderr:tails.stderr.toString('utf8')};},
    hashes(){return Object.fromEntries(Object.entries(tails).map(([k,v])=>[k,createHash('sha256').update(v).digest('hex')]));}
  };
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const executable=process.argv[2],directory=process.argv[3];
  if(process.argv.length!==4||!path.isAbsolute(executable)||directory!==process.cwd()
    ||fs.realpathSync.native(directory)!==directory)throw Error('server_worker_arguments');
  const rawFile=path.join(directory,'server-tail.private.json'),stopFile=path.join(directory,'stop-server');
  const fd=fs.openSync(rawFile,'wx');
  const capture=serverCapture();let stopRequested=false,closed=false;
  function flush(){const bytes=Buffer.from(JSON.stringify({recordedAt:new Date().toISOString(),...capture.metrics(),...capture.raw()}));
    fs.writeSync(fd,bytes,0,bytes.length,0);fs.ftruncateSync(fd,bytes.length);}
  function emit(type,extra={}){console.log(JSON.stringify({type,...capture.metrics(),...extra}));}
  const child=spawn(executable,['serve'],{cwd:directory,env:process.env,windowsHide:true,shell:false,stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',chunk=>capture.consume('stdout',chunk));
  child.stderr.on('data',chunk=>capture.consume('stderr',chunk));
  child.once('spawn',()=>emit('server_started',{pid:child.pid,startedAt:new Date().toISOString()}));
  child.once('error',()=>emit('server_spawn_failed'));
  const interval=setInterval(()=>{flush();emit('server_progress');},10000);
  const stopCheck=setInterval(()=>{if(!closed&&!stopRequested&&fs.existsSync(stopFile)){
    stopRequested=true;emit('server_stop_requested',{pid:child.pid});child.kill();
  }},250);
  child.once('close',(code,signal)=>{
    closed=true;clearInterval(interval);clearInterval(stopCheck);flush();fs.closeSync(fd);
    emit('server_exit',{exitCode:code,signal,controllerStopRequested:stopRequested,tailSha256:capture.hashes()});
    process.exitCode=stopRequested?0:code??1;
  });
}
