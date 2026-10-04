import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { z } from 'zod';

const sha=z.string().regex(/^[a-f0-9]{40}$/),hex=z.string().regex(/^[a-f0-9]{64}$/);
// A fixed descendant of the release Windows Job. The adapter has already
// qualified the container IP against its exact observed Docker identity.
export const activityBrowserInputSchema=z.object({phase:z.enum(['empty','populated']),
 sshHost:z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,79}$/),
 containerAddress:z.string().regex(/^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})$/)
  .refine(v=>v.split('.').every(n=>Number(n)<=255)),
 port:z.number().int().min(1024).max(65535),commit:sha,
 frontendMetaName:z.string().regex(/^[A-Za-z0-9._:-]{1,80}$/),
 cookieName:z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),token:z.string().regex(/^aion_sess_[A-Za-z0-9_-]{43}$/),
 summary:z.string().min(3).max(300),summaryDigest:hex,eventId:z.string().uuid()
}).strict();
const hash=b=>createHash('sha256').update(b).digest('hex');
const fail=()=>{throw Error('release_activity_browser_unproven');};
export function validateActivityBrowserInput(value){const p=activityBrowserInputSchema.parse(value);
 if(hash(p.summary)!==p.summaryDigest)fail();return p;}

export async function runActivityBrowser(value){
 const p=validateActivityBrowserInput(value),origin=`http://127.0.0.1:${p.port}`;
 // Reserve/check the exact loopback listener before OpenSSH. An existing
 // listener is never used as an alternative source of application evidence.
 const probe=createServer();await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(p.port,'127.0.0.1',resolve);});
 await new Promise(resolve=>probe.close(resolve));
 let tunnel,browser,context,ready=false,closed=false,deniedEffects=0;const invalid=[];
 try{
  tunnel=spawn('ssh.exe',['-T','-N','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ExitOnForwardFailure=yes',
   '-o','ConnectTimeout=10','-L',`127.0.0.1:${p.port}:${p.containerAddress}:8000`,p.sshHost],{windowsHide:true,stdio:['ignore','ignore','ignore']});
  tunnel.once('error',()=>invalid.push('tunnel_failed'));tunnel.once('exit',()=>{closed=true;});
  for(let n=0;n<30;n++){
   if(closed||invalid.length)fail();
   try{const r=await fetch(origin+'/health',{signal:AbortSignal.timeout(500)});if(r.status===200){ready=true;break;}}catch{}
   await new Promise(resolve=>setTimeout(resolve,200));
  }
  if(!ready)fail();
  const {chromium}=await import('playwright');browser=await chromium.launch({headless:true});
  context=await browser.newContext({locale:'en-US',viewport:{width:1280,height:900},serviceWorkers:'block'});
  await context.route('**/*',async route=>{const r=route.request(),u=new URL(r.url());
   if(u.origin!==origin||!['GET','HEAD'].includes(r.method())){deniedEffects++;await route.abort();return;}
   await route.continue();});
  const negative=await context.request.get(origin+'/app/personality/overview',{timeout:10000});
  if(negative.status()!==401)fail();
  await context.addCookies([{name:p.cookieName,value:p.token,url:origin,httpOnly:true,sameSite:'Lax',secure:false}]);
  const page=await context.newPage();page.on('pageerror',()=>invalid.push('render_failed'));
  const overviewPromise=page.waitForResponse(r=>r.url()===origin+'/app/personality/overview'&&r.request().method()==='GET',{timeout:20000});
  await page.goto(origin+'/dashboard',{waitUntil:'domcontentloaded',timeout:20000});
  const response=await overviewPromise;if(response.status()!==200)fail();const body=await response.json();
  const items=body?.recent_activity;if(!Array.isArray(items)||items.length!==(p.phase==='empty'?0:1))fail();
  if(p.phase==='populated'&&(items[0]?.event_id!==p.eventId||hash(items[0]?.title??items[0]?.summary??'')!==p.summaryDigest))fail();
  const frontendCommit=await page.locator(`meta[name="${p.frontendMetaName}"]`).getAttribute('content');
  const health=await context.request.get(origin+'/health',{timeout:10000}),healthBody=await health.json();
  if(frontendCommit!==p.commit||healthBody?.deployment?.runtime_build_revision!==p.commit)fail();
  const rows=page.locator('.aion-dashboard-recent-row');
  if(p.phase==='populated')await rows.first().waitFor({state:'visible',timeout:10000});
  else await page.getByRole('heading',{name:'What just changed',exact:true}).waitFor({state:'visible',timeout:10000});
  const count=await rows.count();if(count!==items.length)fail();
  if(p.phase==='populated'&&(await rows.first().innerText()).includes(p.summary)!==true)fail();
  const panel=page.getByRole('heading',{name:'What just changed',exact:true}).locator('..').locator('..').locator('..');
  const dashboardText=await panel.innerText();if(p.phase==='empty'&&!dashboardText.includes('No data yet'))fail();
  const memoryOverview=page.waitForResponse(r=>r.url()===origin+'/app/personality/overview'&&r.request().method()==='GET',{timeout:20000});
  await page.goto(origin+'/memory',{waitUntil:'domcontentloaded',timeout:20000});
  const memoryResponse=await memoryOverview;if(memoryResponse.status()!==200)fail();
  const memoryBody=await memoryResponse.json();if(!Array.isArray(memoryBody?.recent_activity)||memoryBody.recent_activity.length!==items.length)fail();
  const memory=page.locator('.aion-memory-activity-row');
  if(p.phase==='populated')await memory.first().waitFor({state:'visible',timeout:10000});
  else await page.getByText('Recent memory signals',{exact:true}).waitFor({state:'visible',timeout:10000});
  if(await memory.count()!==items.length)fail();
  if(p.phase==='populated'&&!(await memory.first().innerText()).includes(p.summary))fail();
  const memoryText=p.phase==='populated'?await memory.first().innerText():await page.locator('main').innerText();
  if(p.phase==='empty'&&!memoryText.includes('No data yet'))fail();
  if(invalid.length||deniedEffects)fail();
  // Only hashes/counts survive. No session token, page body or production data.
  return {phase:p.phase,activityCount:items.length,backendCommit:p.commit,frontendCommit,
   renderedEventId:p.phase==='populated'?p.eventId:null,renderedSummaryDigest:p.phase==='populated'?p.summaryDigest:null,
   renderDigest:hash(JSON.stringify({dashboardText,memoryText})),negativePathStatus:401,
   providerRequests:0,externalActions:0};
 }finally{
  if(context)await context.close();if(browser)await browser.close();
  if(tunnel&&!closed){tunnel.kill();await new Promise(resolve=>{tunnel.once('exit',resolve);setTimeout(resolve,2000);});}
 }
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 try{if(process.argv.length!==2)fail();let b='';for await(const c of process.stdin){b+=c;if(Buffer.byteLength(b)>8192)fail();}
  const result=await runActivityBrowser(JSON.parse(b));process.stdout.write(JSON.stringify(result));
 }catch{process.stderr.write('release_activity_browser_unproven');process.exitCode=2;}
}
