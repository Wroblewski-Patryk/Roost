import https from 'node:https';
import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const sha = z.string().regex(/^[a-f0-9]{40}$/);
export const composeHealthSettingsSchema = z.object({
  certificateSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  frontendMetaName: z.string().regex(/^[A-Za-z0-9._:-]{1,80}$/),
  requireReleaseReadiness: z.boolean(),
  requireReflectionReadiness: z.boolean()
}).strict();
const fail = reason => { throw Object.assign(Error(`release_compose_health_${reason}`), { retryable: false }); };
const digest = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const rootUrl = value => {
  let u;try { u=new URL(value); } catch { fail('scope_invalid'); }
  if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/')fail('scope_invalid');
  return u.origin;
};
const decode = bytes => { try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{return null;} };

/** Fixed bounded GET. Bodies remain transient and never enter returned evidence. */
function read(url, kind, pin, requestHttps) {
  return new Promise(resolve=>{
    let done=false,request,response,deadline,responseSeen=false;
    const destroy=v=>{try{v?.destroy();}catch{}};
    const finish=(reason,body=null)=>{
      if(done)return;done=true;clearTimeout(deadline);
      resolve({reason,body});if(reason!=='ok'){destroy(response);destroy(request);}
    };
    deadline=setTimeout(()=>finish('transport_timeout'),10000);
    try{
      request=requestHttps(new URL(url),{method:'GET',agent:false,timeout:10000,minVersion:'TLSv1.2',rejectUnauthorized:true,maxHeaderSize:8192,
        headers:{Accept:kind==='backend'?'application/json':'text/html','Cache-Control':'no-store','Accept-Encoding':'identity'}},r=>{
        responseSeen=true;response=r;if(done){destroy(r);return;}
        let bytes=0;const chunks=[];
        r.on('error',()=>finish('response_error'));r.on('aborted',()=>finish('connection_closed'));r.on('close',()=>finish('connection_closed'));
        try{
          if(pin){const raw=r.socket?.getPeerCertificate()?.raw;
            if(!Buffer.isBuffer(raw)||!timingSafeEqual(createHash('sha256').update(raw).digest(),Buffer.from(pin,'hex'))){finish('certificate_pin');return;}}
          if(r.headers.location){finish('redirect');return;}
          if(r.headers['content-encoding']){finish('encoded_response');return;}
          if(r.statusCode!==200){finish('http_status');return;}
          const type=r.headers['content-type'];
          if(typeof type!=='string'||!(kind==='backend'?/^application\/json(?:\s*;|\s*$)/i:/^text\/html(?:\s*;|\s*$)/i).test(type)){finish('content_type');return;}
        }catch{finish('response_invalid');return;}
        r.on('data',chunk=>{if(done)return;const b=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);bytes+=b.length;
          // Readiness may include a bounded diagnostic catalog; the frontend
          // has a separate, smaller bound. Bodies never enter returned proof.
          if(bytes>(kind==='backend'?131072:65536)){finish('body_limit');return;}chunks.push(b);});
        r.on('end',()=>{if(done)return;const text=decode(Buffer.concat(chunks));finish(text===null?'payload_invalid':'ok',text);});
      });
      request.on('error',e=>finish(e?.code==='ECONNRESET'?'connection_closed':e?.code==='ETIMEDOUT'?'transport_timeout':'transport_error'));
      request.on('close',()=>{if(!responseSeen)finish('connection_closed');});
      request.on('timeout',()=>finish('transport_timeout'));request.end();
    }catch{finish('transport_error');}
  });
}

function backendCheck(text,expectedCommit,settings){
  let v;try{v=JSON.parse(text);}catch{return {reason:'backend_payload_invalid',versionVerified:false};}
  const versionVerified=v?.deployment?.runtime_build_revision===expectedCommit;
  if(!v||Array.isArray(v)||typeof v!=='object'||v.status!=='ok')return {reason:'backend_status',versionVerified};
  if(!versionVerified)return {reason:'backend_version',versionVerified:false};
  if(settings.requireReleaseReadiness&&v.release_readiness?.ready!==true)return {reason:'release_readiness',versionVerified};
  if(settings.requireReflectionReadiness&&v.reflection?.deployment_readiness?.ready!==true)return {reason:'reflection_readiness',versionVerified};
  return {reason:'verified',versionVerified};
}

const entities=Object.freeze({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',colon:':',period:'.',lowbar:'_',Tab:'\t',NewLine:'\n'});
const entityDecode=text=>text.replace(/&(#x[0-9a-f]+|#[0-9]+|[A-Za-z]+);?/gi,(_whole,key)=>{
  if(key[0]==='#'){const n=key[1]?.toLowerCase()==='x'?Number.parseInt(key.slice(2),16):Number.parseInt(key.slice(1),10);
    return Number.isInteger(n)&&n>0&&n<=0x10ffff?String.fromCodePoint(n):'\uFFFD';}
  return entities[key]??_whole;
});
function attributes(tag){
  const source=tag.replace(/^<meta\b/i,'').replace(/>$/,'');const attrs=new Map();let rest=source;
  while(rest.length){rest=rest.replace(/^\s+/,'');if(rest===''||/^\/\s*$/.test(rest))break;
    const key=rest.match(/^[^\s"'<>/=]+/);if(!key)return null;rest=rest.slice(key[0].length).replace(/^\s+/,'');
    let value='';if(rest[0]==='='){rest=rest.slice(1).replace(/^\s+/,'');
      if(rest[0]==='"'||rest[0]==="'"){const q=rest[0],end=rest.indexOf(q,1);if(end<0)return null;value=rest.slice(1,end);rest=rest.slice(end+1);}
      else{const match=rest.match(/^[^\s"'=<>`]+/);if(!match)return null;value=match[0];rest=rest.slice(value.length);}}
    const name=key[0].toLowerCase();if(attrs.has(name))return null;attrs.set(name,value);
  }return attrs;
}
function frontendCheck(text,metaName,expectedCommit){
  // Comments and HTML raw-text/inert elements cannot supply the live revision.
  const source=text.replace(/<!--[\s\S]*?(?:-->|$)/g,'');
  const tags=source.match(/<\/?[A-Za-z][A-Za-z0-9:-]*(?=[\s/>])(?:"[^"]*"|'[^']*'|[^'">])*?>/g)??[];
  const matches=[];let rawTag=null,templateDepth=0;
  for(const tag of tags){const name=tag.match(/^<\/?([A-Za-z][A-Za-z0-9:-]*)/)[1].toLowerCase(),closing=tag.startsWith('</');
    if(rawTag){if(closing&&name===rawTag)rawTag=null;continue;}
    if(!closing&&['script','style','textarea','title'].includes(name)){rawTag=name;continue;}
    if(name==='template'){templateDepth=Math.max(0,templateDepth+(closing?-1:1));continue;}
    if(templateDepth||closing||name!=='meta')continue;
    const attrs=attributes(tag);if(!attrs)return 'frontend_meta_invalid';
    if(entityDecode(attrs.get('name')??'')===metaName)matches.push(attrs);}
  if(matches.length!==1)return matches.length>1?'frontend_meta_duplicate':'frontend_meta_missing';
  const meta=matches[0];
  if(meta.get('name')!==metaName||/&/.test(meta.get('content')??''))return 'frontend_meta_encoding';
  return meta.get('content')===expectedCommit?'verified':'frontend_version';
}

/** Dependencies are test-only source injection, never installation/model settings. */
export async function probeComposeHealth({publicUrl,expectedCommit,health}, {request:requestHttps=https.request}={}){
  const settings=composeHealthSettingsSchema.parse(health),commit=sha.parse(expectedCommit),origin=rootUrl(publicUrl);
  if(typeof requestHttps!=='function')fail('transport_invalid');
  const observations=[];
  for(const [surface,path]of [['backend','/health'],['frontend','/']]){
    const row=await read(origin+path,surface,settings.certificateSha256,requestHttps);
    const assessed=row.reason!=='ok'?{reason:row.reason,versionVerified:false}:surface==='backend'?backendCheck(row.body,commit,settings):
      (()=>{const reason=frontendCheck(row.body,settings.frontendMetaName,commit);return {reason,versionVerified:reason==='verified'};})();
    observations.push({surface,healthy:assessed.reason==='verified',versionVerified:assessed.versionVerified,reason:assessed.reason});
  }
  const healthy=observations.every(r=>r.healthy),versionVerified=observations.every(r=>r.versionVerified);
  const healthDigest=digest({protocol:'roost-compose-version-health-v1',expectedCommit:commit,settingsDigest:digest(settings),observations});
  return Object.freeze({healthy,versionVerified,healthDigest,observations:Object.freeze(observations.map(r=>Object.freeze(r)))});
}

/** The public origin is bound once from the sealed target; per-call overrides fail. */
export function createComposeHealthProbe({publicUrl,health},dependencies={}){
  const origin=rootUrl(publicUrl),settings=composeHealthSettingsSchema.parse(health);
  return async input=>{
    if(!input||Object.keys(input).some(k=>!['expectedCommit','publicUrl'].includes(k)))fail('scope_invalid');
    if(input.publicUrl!==undefined&&rootUrl(input.publicUrl)!==origin)fail('scope_changed');
    return probeComposeHealth({publicUrl:origin,expectedCommit:input.expectedCommit,health:settings},dependencies);
  };
}

/** An installed network fence requires a negative public observation and a
 * separate positive internal health proof. HTTP errors from the app itself,
 * certificate failures and malformed responses cannot qualify isolation. */
export async function probeComposeIngressBlocked({publicUrl,health}, {request:requestHttps=https.request}={}){
  const settings=composeHealthSettingsSchema.parse(health),origin=rootUrl(publicUrl);
  if(typeof requestHttps!=='function')fail('transport_invalid');
  return new Promise((resolve,reject)=>{
    let done=false,request,deadline;
    const finish=(status,timeout=false)=>{
      if(done)return;done=true;clearTimeout(deadline);
      try{request?.destroy();}catch{}
      if(!(timeout&&status===null||!timeout&&[502,504].includes(status))){reject(Object.assign(Error('release_compose_health_ingress_unproven'),{retryable:false}));return;}
      resolve({blocked:true,observedAt:new Date().toISOString(),httpStatus:status,transportTimeout:timeout});
    };
    deadline=setTimeout(()=>finish(null,true),10000);
    try{
      request=requestHttps(new URL(origin+'/health'),{method:'GET',agent:false,timeout:10000,minVersion:'TLSv1.2',rejectUnauthorized:true,maxHeaderSize:8192,
        headers:{Accept:'application/json','Cache-Control':'no-store','Accept-Encoding':'identity'}},response=>{
        try{
          if(settings.certificateSha256){const raw=response.socket?.getPeerCertificate()?.raw;
            if(!Buffer.isBuffer(raw)||!timingSafeEqual(createHash('sha256').update(raw).digest(),Buffer.from(settings.certificateSha256,'hex'))){finish(undefined);return;}}
          finish(response.headers.location?undefined:response.statusCode);
        }catch{finish(undefined);}finally{try{response.destroy();}catch{}}
      });
      request.on('error',()=>finish(undefined));request.on('timeout',()=>finish(null,true));request.end();
    }catch{finish(undefined);}
  });
}

/** Observe restored services from actual public version checks and fresh loop
 * receipts. A skipped tick needs a separately verified execution expectation. */
export async function observeRestoredComposeRuntime({commit,tree,since,observationSeconds,cadences,operationId},
  {probeHealth,readCadenceTicks,now=Date.now,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
  sha.parse(commit);sha.parse(tree);
  if(!Number.isFinite(Date.parse(since))||!Number.isInteger(observationSeconds)||observationSeconds<1||observationSeconds>300
    ||!Array.isArray(cadences)||cadences.length!==2||new Set(cadences.map(c=>c.name)).size!==2
    ||typeof probeHealth!=='function'||typeof readCadenceTicks!=='function')fail('restored_scope_invalid');
  const startedAt=new Date(now()).toISOString();
  if(Date.parse(startedAt)<Date.parse(since))fail('restored_time_invalid');
  for(;;){
    const h=await probeHealth({expectedCommit:commit});
    if(h?.healthy!==true||h.versionVerified!==true)fail('restored_health_unproven');
    if(now()-Date.parse(startedAt)>=observationSeconds*1000)break;
    await sleep(Math.min(3000,observationSeconds*1000-(now()-Date.parse(startedAt))));
  }
  const ticks=await readCadenceTicks({operationId,since,commit,tree});
  if(ticks?.status!=='observed'||ticks.cadenceEvidence?.length!==2
    ||new Set(ticks.cadenceEvidence.map(c=>c.name)).size!==2
    ||ticks.cadenceEvidence.some(c=>!cadences.some(e=>e.name===c.name&&e.behaviorDigest===c.behaviorDigest)
      ||c.behaviorVerified!==true||!Number.isInteger(c.completedTicks)||c.completedTicks<1||c.failureState==='recorded'
      ||!/^[a-f0-9]{64}$/.test(c.summaryDigest??'')||!Number.isFinite(Date.parse(c.lastRunAt))||!Number.isFinite(Date.parse(c.observedAt))
      ||!['executed','skipped'].includes(c.executionState)
      ||c.executionState==='skipped'&&(c.executionExpectationVerified!==true||c.expectedExecutionState!=='skipped')
      ||Date.parse(c.lastRunAt)<Date.parse(since)||Date.parse(c.lastRunAt)>Date.parse(c.observedAt)
      ||Date.parse(c.observedAt)<Date.parse(startedAt)||Date.parse(c.observedAt)>now()))fail('restored_ticks_unproven');
  return {backendCommit:commit,frontendCommit:commit,healthy:true,startedAt,observedAt:new Date(now()).toISOString(),
    cadenceEvidence:ticks.cadenceEvidence.map(c=>Object.fromEntries(['name','behaviorDigest','executionState','behaviorVerified','summaryDigest','completedTicks','observedAt'].map(k=>[k,c[k]])))};
}
