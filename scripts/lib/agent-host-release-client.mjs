import { spawn } from 'node:child_process';
import { createHash, timingSafeEqual } from 'node:crypto';
import https from 'node:https';
import { checkServerIdentity } from 'node:tls';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { guardHostContent } from './agent-host-redaction.mjs';

const fail = code => { throw Object.assign(Error(code), { retryable: false }); };
export const releaseClientSchema=z.object({hostId:z.string().uuid(),agentId:z.string().uuid(),
 credentialTarget:z.string().regex(/^Roost\/Gate[34]\/[A-Za-z0-9._-]{1,80}$/),
 certificateFingerprint:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export async function readReleaseCredential(target) {
 if(!/^Roost\/Gate[34]\/[A-Za-z0-9._-]{1,80}$/.test(target))fail('release_credential_target_invalid');
 const script=fileURLToPath(new URL('../roost-agent-credential.ps1',import.meta.url));
 const source=`$ErrorActionPreference='Stop'; . '${script.replaceAll("'","''")}'; [Console]::Out.Write([RoostCredential]::Read('${target}'))`;
 const value=await new Promise((resolve,reject)=>{
  const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(source,'utf16le').toString('base64')],
   {shell:false,windowsHide:true,stdio:['ignore','pipe','ignore']});
  let bytes=0,value='';const timer=setTimeout(()=>child.kill(),10000);
  child.stdout.on('data',c=>{bytes+=c.length;if(bytes>4096)child.kill();else value+=c.toString('utf8');});
  child.once('error',()=>{clearTimeout(timer);reject(Error('release_credential_unavailable'));});
  child.once('close',code=>{clearTimeout(timer);code===0&&bytes<=4096?resolve(value):reject(Error('release_credential_unavailable'));});
 });
 if(typeof value!=='string'||value.length<16||value.length>4096||/[\s\x00-\x1f]/.test(value))fail('release_credential_invalid');
 return value;
}
export async function releaseApi({baseUrl,config,key,route,method='GET',body}){
 releaseClientSchema.parse(config);
 const origin=new URL(baseUrl);
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.search||origin.hash||origin.pathname!=='/'
  ||!/^\/v1\/agent-runtime\/releases(?:\?hostId=[a-f0-9-]{36}|\/[a-f0-9-]{36}(?:\/operations(?:\/[a-f0-9-]{36}\/outcome)?)?)?$/.test(route)
  ||!['GET','POST'].includes(method)||!/^cc_v1_[A-Za-z0-9_-]{32}$/.test(key))fail('release_api_input_invalid');
 if((method==='POST')!==(body!==undefined))fail('release_api_input_invalid');
 const payload=body===undefined?null:JSON.stringify(guardHostContent(body,'required',[key]).value);
 if(payload&&Buffer.byteLength(payload)>65536)fail('release_api_input_invalid');
 return new Promise((resolve,reject)=>{
  const request=https.request({hostname:origin.hostname,servername:origin.hostname,port:origin.port||443,path:route,method,
   agent:false,minVersion:'TLSv1.2',rejectUnauthorized:true,timeout:15000,maxHeaderSize:8192,
   checkServerIdentity:(host,cert)=>checkServerIdentity(host,cert)||
    (timingSafeEqual(createHash('sha256').update(cert.raw??Buffer.alloc(0)).digest(),Buffer.from(config.certificateFingerprint,'hex'))?undefined:Error('release_tls_pin_invalid')),
   headers:{'X-API-Key':key,Accept:'application/json','Cache-Control':'no-store',
    ...(payload?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}:{})}},response=>{
    if(response.headers.location||response.headers['content-encoding']){response.destroy();reject(Error('release_api_response_invalid'));return;}
    const chunks=[];let bytes=0;
    response.on('data',c=>{bytes+=c.length;if(bytes>512000)response.destroy();else chunks.push(c);});
    response.on('error',()=>reject(Error('release_api_uncertain')));
    response.on('end',()=>{try{
     const v=JSON.parse(Buffer.concat(chunks).toString('utf8'));
     if(![200,201].includes(response.statusCode)){const error=typeof v.error==='string'&&/^release_[a-z0-9_]{1,100}$/.test(v.error)?v.error:'release_api_rejected';reject(Error(error));return;}
     if(!v.data||typeof v.data!=='object')throw Error();
     const checked=guardHostContent(v.data,'required',[key]);if(checked.redacted)throw Error();resolve(checked.value);
    }catch{reject(Error('release_api_response_invalid'));}});
   });
  request.on('error',()=>reject(Error('release_api_uncertain')));request.on('timeout',()=>request.destroy());request.end(payload??undefined);
 });
}
