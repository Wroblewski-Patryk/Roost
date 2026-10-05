import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { lstatSync, readFileSync, realpathSync, openSync, writeFileSync, fsyncSync, closeSync } from 'node:fs';
import path from 'node:path';
import { trustedPilotBytes } from './agent-host-trusted-pilot.mjs';
import { hostTransport } from './agent-host-redaction.mjs';

export const terminalCompletionTimeoutMs = 30000;
const maximumBytes = 1048576, uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const digest = value => createHash('sha256').update(Buffer.isBuffer(value) ? value : trustedPilotBytes(value)).digest('hex');
const equal = (a,b) => digest(a) === digest(b);
const handles = new WeakMap();
const uncertain = reason => Object.assign(new Error('agent_terminal_completion_uncertain'), {
  terminalCompletionUncertain:true, retryable:false, details:{phase:'terminal_completion',reason}
});
const assert = (value,reason) => { if (!value) throw uncertain(reason); };
const fields = ['executionId','workspaceId','taskId','applicationId','agentHostId','attempt','checkpointVersion'];
function scopeOf(e) {
  const s={executionId:e?.id,workspaceId:e?.workspaceId,taskId:e?.taskId,applicationId:e?.applicationId,agentHostId:e?.agentHostId,attempt:e?.attempt,checkpointVersion:e?.checkpointVersion};
  assert(fields.slice(0,5).every(k=>uuid.test(s[k]??''))&&Number.isInteger(s.attempt)&&s.attempt>0&&Number.isInteger(s.checkpointVersion)&&s.checkpointVersion>0,'scope_invalid');return s;
}
function directoryOf(directory) {
  const full=path.resolve(directory),s=lstatSync(full);
  assert(s.isDirectory()&&!s.isSymbolicLink()&&path.resolve(realpathSync(full))===full,'private_directory_invalid');return full;
}
function boundedFile(file) {
  const s=lstatSync(file);assert(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&s.size>0&&s.size<=maximumBytes*2,'intent_file_invalid');return readFileSync(file);
}
function durableNew(file,bytes) {
  const fd=openSync(file,'wx',0o600);try{writeFileSync(fd,bytes);fsyncSync(fd);}finally{closeSync(fd);}
  assert(boundedFile(file).equals(bytes),'intent_readback_invalid');
}
// The fixed DPAPI program consumes only stdin. Credentials never appear in
// executable arguments, shell strings, logs, or a plaintext journal.
async function dpapi(bytes,entropy,operation) {
  assert(process.platform==='win32'&&['Protect','Unprotect'].includes(operation),'dpapi_unavailable');
  assert(Buffer.isBuffer(bytes)&&bytes.length>0&&bytes.length<=maximumBytes*2,'dpapi_input_invalid');
  const program="$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Security; $r=ConvertFrom-Json ([Console]::In.ReadToEnd()); $v=[Convert]::FromBase64String($r.value); $e=[Convert]::FromBase64String($r.entropy); try { $o=[Security.Cryptography.ProtectedData]::"+operation+"($v,$e,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($o)); } finally { [Array]::Clear($v,0,$v.Length); }";
  return new Promise((resolve,reject)=>{
    const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(program,'utf16le').toString('base64')],{windowsHide:true,shell:false,stdio:['pipe','pipe','ignore']});
    let size=0,closed=false;const chunks=[],timer=setTimeout(()=>{child.kill();reject(uncertain('dpapi_timeout'));},10000);
    child.stdout.on('data',b=>{size+=b.length;if(size>maximumBytes*3){child.kill();reject(uncertain('dpapi_output_invalid'));}else chunks.push(b);});
    child.once('error',()=>{clearTimeout(timer);reject(uncertain('dpapi_failed'));});
    child.once('close',code=>{clearTimeout(timer);closed=true;const text=Buffer.concat(chunks).toString('ascii');if(code!==0||!text||!/^[A-Za-z0-9+/]+={0,2}$/.test(text))return reject(uncertain('dpapi_failed'));const out=Buffer.from(text,'base64');if(out.length===0||out.length>maximumBytes*2)return reject(uncertain('dpapi_output_invalid'));resolve(out);});
    child.stdin.on('error',()=>{if(!closed)reject(uncertain('dpapi_failed'));});child.stdin.end(JSON.stringify({value:bytes.toString('base64'),entropy:entropy.toString('base64')}));
  });
}
function immutablePayload(payload,extraSecrets) {
  const wire=JSON.stringify(payload);assert(Buffer.byteLength(wire)<=maximumBytes,'completion_payload_invalid');
  const transported=hostTransport(wire,extraSecrets);
  // The stored request and actual Worker transport must be byte-equivalent;
  // silently persisting evidence different from redacted submission is unsafe.
  assert(transported.redacted===false&&equal(JSON.parse(transported.body),payload),'completion_transport_changed');
  assert(typeof payload.leaseToken==='string'&&payload.leaseToken.length>=1&&payload.leaseToken.length<=256&&typeof payload.summary==='string'&&payload.summary.length>0&&payload.summary.length<=10000&&Array.isArray(payload.changedFiles)&&payload.verification&&typeof payload.verification==='object'&&!Array.isArray(payload.verification)&&payload.usage&&typeof payload.usage==='object','completion_payload_invalid');
  const keys=['leaseToken','summary','finalResponse','resultRevision','codexThreadId','changedFiles','verification','usage','metadata'];assert(Object.keys(payload).every(k=>keys.includes(k)),'completion_payload_invalid');
  assert(!['executionContract','readyContextPin','resultRevision','resultRevisionReviewVersion'].some(k=>Object.hasOwn(payload.metadata??{},k)),'completion_metadata_forbidden');
  return JSON.parse(wire);
}
function createHandle(record,file,body,executionThread) {const h=Object.freeze({schemaVersion:'roost-terminal-completion-handle-v1',executionId:record.scope.executionId,intentDigest:digest(record),payloadDigest:record.payloadDigest});handles.set(h,{record,file,body,executionThread});return h;}
function dataOf(h) {const d=handles.get(h);assert(d&&digest(JSON.parse(boundedFile(d.file)))===h.intentDigest,'intent_changed');return d;}
export function terminalCompletionMatches(execution,{scope,payload,previousThreadId=null}) {
  try {
    if(!equal(scopeOf(execution),scope)||execution.status!=='completed'||!Number.isFinite(Date.parse(execution.completedAt))||execution.leaseToken!==null||execution.leaseExpiresAt!==null||execution.contextInvalidatedAt||execution.cancelRequestedAt)return false;
    for(const k of ['summary','changedFiles','verification','usage'])if(!equal(execution[k],payload[k]))return false;
    if((execution.finalResponse??null)!==(payload.finalResponse??null)||(execution.codexThreadId??null)!==(payload.codexThreadId===undefined?previousThreadId:payload.codexThreadId))return false;
    for(const[k,v]of Object.entries(payload.metadata??{}))if(!equal(execution.metadata?.[k],v))return false;
    const r=execution.metadata?.resultRevision;
    if(payload.resultRevision){if(!r||r.schemaVersion!=='roost-result-revision-v1'||!uuid.test(r.id??'')||!Number.isFinite(Date.parse(r.observedAt))||r.executionId!==scope.executionId||r.attempt!==scope.attempt||r.hostId!==scope.agentHostId||r.checkpointVersion!==scope.checkpointVersion)return false;for(const k of ['commit','branch','workingTree'])if(r[k]!==payload.resultRevision[k])return false;if(execution.metadata?.resultRevisionReviewVersion!=='1')return false;}
    else if(r!==null&&r!==undefined)return false;
    return true;
  }catch{return false;}
}
// Dependencies are fixed by the production export. Tests may inject a cipher
// into this factory; configuration, API packets and models cannot select one.
export function createTerminalCompletionStore({protect=(b,e)=>dpapi(b,e,'Protect'),unprotect=(b,e)=>dpapi(b,e,'Unprotect')}={}) {
  async function create({directory,execution,payload,extraSecrets=[]}) {
    const dir=directoryOf(directory),scope=scopeOf(execution),body=immutablePayload(payload,extraSecrets);
    assert(['claimed','running','waiting_for_approval'].includes(execution.status)&&body.leaseToken===execution.leaseToken&&Number.isFinite(Date.parse(execution.leaseExpiresAt))&&Date.parse(execution.leaseExpiresAt)>Date.now()&&!execution.contextInvalidatedAt&&!execution.cancelRequestedAt,'live_completion_scope_invalid');
    const file=path.join(dir,'terminal-completion-'+scope.executionId+'.intent.json'),entropy=Buffer.from(digest({purpose:'roost-terminal-completion-v1',scope}),'hex');
    const privateBytes=trustedPilotBytes({scope,payload:body,previousThreadId:execution.codexThreadId??null}),ciphertext=await protect(privateBytes,entropy);
    assert(Buffer.isBuffer(ciphertext)&&ciphertext.length>0&&!ciphertext.equals(privateBytes),'ciphertext_invalid');
    const record={schemaVersion:'roost-terminal-completion-intent-v1',phase:'prepared',scope,createdAt:new Date().toISOString(),payloadDigest:digest(body),cipher:'windows_dpapi_current_user',ciphertext:ciphertext.toString('base64')};
    durableNew(file,Buffer.from(JSON.stringify(record)+'\n'));
    const opened=await unprotect(ciphertext,entropy);assert(opened.equals(privateBytes),'cipher_readback_invalid');return createHandle(record,file,body,execution.codexThreadId??null);
  }
  async function load({directory,executionId}) {
    assert(uuid.test(executionId??''),'scope_invalid');const file=path.join(directoryOf(directory),'terminal-completion-'+executionId+'.intent.json'),record=JSON.parse(boundedFile(file));
    assert(record.schemaVersion==='roost-terminal-completion-intent-v1'&&record.phase==='prepared'&&record.scope?.executionId===executionId&&record.cipher==='windows_dpapi_current_user'&&/^[A-Za-z0-9+/]+={0,2}$/.test(record.ciphertext??''),'intent_record_invalid');
    const scope=scopeOf({...record.scope,id:executionId}),entropy=Buffer.from(digest({purpose:'roost-terminal-completion-v1',scope}),'hex'),plain=await unprotect(Buffer.from(record.ciphertext,'base64'),entropy),opened=JSON.parse(plain);
    assert(equal(opened.scope,scope)&&digest(opened.payload)===record.payloadDigest,'intent_decryption_binding_invalid');return createHandle(record,file,opened.payload,opened.previousThreadId??null);
  }
  const safe=fn=>async options=>{try{return await fn(options);}catch(e){if(e.terminalCompletionUncertain)throw e;throw uncertain('completion_store_unavailable');}};
  return Object.freeze({create:safe(create),load:safe(load)});
}
const store=createTerminalCompletionStore();
export const createTerminalCompletionIntent=options=>store.create(options);
export const loadTerminalCompletionIntent=options=>store.load(options);
function acknowledge(d,execution,source) {
  assert(terminalCompletionMatches(execution,{scope:d.record.scope,payload:d.body,previousThreadId:d.executionThread}),'completion_result_mismatch');
  return Object.freeze({schemaVersion:'roost-terminal-completion-observation-v1',executionId:d.record.scope.executionId,intentDigest:digest(d.record),payloadDigest:d.record.payloadDigest,executionDigest:digest(execution),source,status:'completed',verified:true,replayed:false});
}
export async function reconcileTerminalCompletion({intent,api}) {
  const d=dataOf(intent);let actual;try{actual=await api('/v1/agent-runtime/executions/'+d.record.scope.executionId,{signal:AbortSignal.timeout(terminalCompletionTimeoutMs)});}catch{throw uncertain('completion_readback_unavailable');}
  return acknowledge(d,actual,'normal_readback');
}
export async function submitTerminalCompletion({intent,api}) {
  const d=dataOf(intent);let actual;
  // A separately persisted dispatch marker forbids replay even after process
  // death or loss of the first POST response. Recovery is GET-only.
  try{durableNew(d.file.replace(/\.intent\.json$/,'.dispatch.json'),Buffer.from(JSON.stringify({schemaVersion:'roost-terminal-completion-dispatch-v1',intentDigest:digest(d.record),payloadDigest:d.record.payloadDigest,executionId:d.record.scope.executionId,createdAt:new Date().toISOString()})+'\n'));}catch{throw uncertain('completion_dispatch_already_exists_or_unavailable');}
  try{actual=await api('/v1/agent-runtime/executions/'+d.record.scope.executionId+'/actions/complete',{method:'POST',body:JSON.stringify(d.body),signal:AbortSignal.timeout(terminalCompletionTimeoutMs)});}catch(error){
    // The fixed Worker client maps an explicit 409 context invalidation to this
    // flag. It is a definite denial, so preserve its existing stop/ACK path.
    if(error?.contextStop===true)throw error;
    return reconcileTerminalCompletion({intent,api});
  }
  if(terminalCompletionMatches(actual,{scope:d.record.scope,payload:d.body,previousThreadId:d.executionThread}))return acknowledge(d,actual,'normal_completion_ack');
  return reconcileTerminalCompletion({intent,api});
}
