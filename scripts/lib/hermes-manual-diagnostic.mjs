// One private, bounded failure bundle. Never use repository paths for this store.
import fs from 'node:fs';
import path from 'node:path';
import {assertOwned,sha256,within,inventory} from './hermes-manual-install.mjs';
const schema='hermes-manual-diagnostic-v1';
const filenames=['failure.log','receipt.json'];
export function failureSummary(stdout,stderr) {
  if(stdout.length>131072||stderr.length>32768)throw Error('diagnostic_budget');
  const text=Buffer.concat([stdout,stderr]).toString('utf8');
  // Conservative pattern screen, not proof that arbitrary upstream output is secret-free.
  if(/(?:Bearer\s+\S+|(?:api[_-]?key|access[_-]?token|password|secret)\s*[:=]\s*\S+|-----BEGIN [A-Z ]*PRIVATE KEY-----|https?:\/\/[^\s/]+:[^\s/@]+@|\b(?:gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9_-]{20,}))/i.test(text))throw Error('diagnostic_secret_detected');
  const match=text.match(/(?:The term\s+['"]([A-Za-z0-9_.-]{1,64})['"]\s+is not recognized as the name|\b([A-Za-z0-9_.-]{1,64}): command not found)/i);
  return {missingCommand:match?.[1]??match?.[2]??null,
    stdout:{bytes:stdout.length,sha256:sha256(stdout)},stderr:{bytes:stderr.length,sha256:sha256(stderr)}};
}
function existingStore(directory) {
  if(!fs.existsSync(directory))return null;
  const names=fs.readdirSync(directory).sort();
  if(JSON.stringify(names)!==JSON.stringify(filenames))throw Error('diagnostic_store_unknown');
  if(names.some(n=>fs.lstatSync(path.join(directory,n)).nlink!==1))throw Error('diagnostic_store_link');
  inventory(directory,{maxBytes:200000});
  const receipt=JSON.parse(fs.readFileSync(path.join(directory,'receipt.json'),'utf8'));
  if(receipt.schema!==schema)throw Error('diagnostic_store_unknown');
  assertOwned(directory,receipt.directoryIdentity);
  if(sha256(fs.readFileSync(path.join(directory,'failure.log')))!==receipt.logSha256)throw Error('diagnostic_readback');
  return receipt;
}
export function readFailureReceipt(directory) { return existingStore(directory); }
export function retireFailure(directory,expected,{started=false}={}) {
  if(!started)throw Error('diagnostic_attempt_not_started');
  const current=existingStore(directory);
  if(!current)return false;
  if(!expected||current.directoryIdentity!==expected.directoryIdentity||current.logSha256!==expected.logSha256)throw Error('diagnostic_changed');
  assertOwned(directory,current.directoryIdentity);
  fs.rmSync(directory,{recursive:true});
  return true;
}
export function retainLatestFailure(directory,{stdout,stderr,stage,exitCode,controllerReason=null,monitorDetail=null},deniedRoots) {
  for(const value of [controllerReason,monitorDetail])if(value!==null&&!/^[a-zA-Z_]{1,80}$/.test(value))throw Error('diagnostic_reason');
  if(!path.isAbsolute(directory)||deniedRoots.some(r=>within(r,directory)||within(directory,r)))throw Error('diagnostic_location');
  const parent=path.dirname(directory);
  if(fs.realpathSync.native(parent)!==parent)throw Error('diagnostic_parent');
  const previous=existingStore(directory);
  let summary;
  try{summary=failureSummary(stdout,stderr);}catch(error){
    // A detected secret is never retained, including in an older owned bundle.
    if(error.message==='diagnostic_secret_detected'&&previous){assertOwned(directory,previous.directoryIdentity);fs.rmSync(directory,{recursive:true});}
    throw error;
  }
  if(!previous)fs.mkdirSync(directory);
  const directoryIdentity=String(fs.statSync(directory,{bigint:true}).ino);
  assertOwned(directory,directoryIdentity);
  const bytes=Buffer.concat([Buffer.from('STDOUT\n'),stdout,Buffer.from('\nSTDERR\n'),stderr]);
  const receipt={schema,directoryIdentity,stage,exitCode,...summary,logSha256:sha256(bytes),
    ...(controllerReason?{controllerReason}:{}),...(monitorDetail?{monitorDetail}:{})};
  // Atomic per-file replacement; an interrupted mismatched pair fails closed on readback.
  for(const [name,content] of [['failure.log',bytes],['receipt.json',JSON.stringify(receipt)+'\n']]){
    const pending=path.join(directory,name+'.pending');fs.writeFileSync(pending,content,{flag:'wx'});
    fs.renameSync(pending,path.join(directory,name));
  }
  if(sha256(fs.readFileSync(path.join(directory,'failure.log')))!==receipt.logSha256)throw Error('diagnostic_readback');
  return {retained:true,...summary};
}
