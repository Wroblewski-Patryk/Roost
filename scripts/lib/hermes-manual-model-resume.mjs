import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {sha256} from './hermes-manual-install.mjs';

export function validateRanges(parts,size,completed){
  let offset=0,total=0;
  for(let n=0;n<parts.length;n++){
    const p=parts[n];
    if(![p.N,p.Offset,p.Size,p.Completed].every(Number.isSafeInteger)||p.N!==n||p.Offset!==offset
      ||p.Size<=0||p.Completed<0||p.Completed>p.Size)throw Error('partial_ranges');
    offset+=p.Size;total+=p.Completed;
  }
  if(parts.length!==16||offset!==size||total!==completed)throw Error('partial_totals');
  return total;
}
function hashFile(file){
  const hash=createHash('sha256'),buffer=Buffer.alloc(4*1024*1024),fd=fs.openSync(file,'r');
  try{for(let n;(n=fs.readSync(fd,buffer,0,buffer.length,null))>0;)hash.update(buffer.subarray(0,n));}finally{fs.closeSync(fd);}
  return hash.digest('hex');
}
export function admitPreviousPartial({store,receiptPath,receiptHash,manifestBytes}){
  const bytes=fs.readFileSync(receiptPath);if(sha256(bytes)!==receiptHash)throw Error('previous_receipt_drift');
  const previous=JSON.parse(bytes),manifest=JSON.parse(manifestBytes);
  if(previous.schema!=='hermes-manual-model-attempt-v1'||previous.result!=='BLOCKED'||previous.reason!=='native_pull_output_limit'
    ||previous.pullAttempts!==1||previous.model.name!=='gpt-oss:20b'||previous.model.installed||!previous.partialStore.retained
    ||previous.model.registryExpectedDigest!=='sha256:'+sha256(manifestBytes))throw Error('previous_model_receipt');
  if(fs.realpathSync.native(store)!==store||fs.lstatSync(store).isSymbolicLink())throw Error('store_identity');
  const modelLayers=manifest.layers.filter(l=>l.mediaType==='application/vnd.ollama.image.model');
  if(modelLayers.length!==1||![manifest.config,...manifest.layers].every(l=>/^sha256:[a-f0-9]{64}$/.test(l.digest)))throw Error('manifest_layers');
  const model=modelLayers[0],prefix=model.digest.replace(':','-')+'-partial';
  const expected=[prefix,...Array.from({length:16},(_,n)=>prefix+'-'+n)].sort();
  const found=[];function walk(p){for(const item of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,item.name);if(item.isSymbolicLink())throw Error('partial_link');if(item.isDirectory())walk(f);else found.push(path.relative(store,f).replaceAll('\\','/'));}}walk(store);
  if(JSON.stringify(found.sort())!==JSON.stringify(expected.map(n=>'blobs/'+n).sort()))throw Error('unexpected_store_inventory');
  const rows=expected.map(name=>{
    const file=path.join(store,'blobs',name),before=fs.lstatSync(file,{bigint:true});
    if(!before.isFile()||before.nlink!==1n||Number(before.mtimeMs)>Date.parse(previous.recordedAt))throw Error('partial_changed_or_shared');
    const digest=hashFile(file),after=fs.lstatSync(file,{bigint:true});
    if(before.ino!==after.ino||before.size!==after.size||before.mtimeNs!==after.mtimeNs)throw Error('partial_changed_during_hash');
    return {path:'blobs/'+name,fileId:`${before.dev}:${before.ino}`,bytes:Number(before.size),mtimeNs:String(before.mtimeNs),sha256:digest};
  });
  const parts=Array.from({length:16},(_,n)=>JSON.parse(fs.readFileSync(path.join(store,'blobs',prefix+'-'+n))));
  if(rows.find(r=>r.path==='blobs/'+prefix).bytes!==model.size||rows.reduce((n,r)=>n+r.bytes,0)!==previous.partialStore.logicalBytes)throw Error('partial_sizes');
  const completed=validateRanges(parts,model.size,previous.partialStore.reportedCompletedBytes);
  return {schema:'hermes-manual-partial-admission-v1',previousReceiptSha256:receiptHash,manifestSha256:sha256(manifestBytes),
    files:rows.length,logicalBytes:previous.partialStore.logicalBytes,completedBytes:completed,rows,
    evidence:'previous_empty_store_attempt_receipt_matching_names_ranges_sizes_completed_and_pre_receipt_mtimes; current_hash_baseline_not_historical_hashes'};
}
