import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {readFile,readdir,mkdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {build} from 'esbuild';
import {chromium} from 'playwright';

const output=path.join(os.tmpdir(),'roost-finding-ui');await mkdir(output,{recursive:true});
const bundle=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{FindingWorkbench}from'./web/src/features/departments/finding-workbench';createRoot(document.getElementById('root')).render(<LanguageProvider><FindingWorkbench applicationId="00000000-0000-4000-8000-000000000001"/></LanguageProvider>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,jsx:'automatic',define:{'process.env.NODE_ENV':'"test"'}});
const css=await readFile(path.join('public/react/assets',(await readdir('public/react/assets')).find(name=>/^index-.*\.css$/.test(name))));
const server=createServer((req,res)=>{if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');return res.end(bundle.outputFiles[0].text);}if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');return res.end(css);}res.setHeader('Content-Type','text/html');res.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><main id="root" style="padding:24px;max-width:1400px;margin:auto"></main><script src="/app.js"></script></html>');});
server.listen(0,'127.0.0.1');await once(server,'listening');
const browser=await chromium.launch({headless:true}),uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,revision='a'.repeat(64);
const refs=['application','component','task','company_record','project','procedure'].map((type,i)=>({type,id:uuid(i+1),label:['Atlas portal','Validation parser','Parser source task','Reproduction evidence','Atlas project','Parser procedure'][i],revision}));
const workers=[{id:uuid(20),name:'Quality reviewer',principal:{kind:'user',id:uuid(21)},departmentKeys:['09-technologia']},{id:uuid(22),name:'Product manager',principal:{kind:'user',id:uuid(23)},departmentKeys:['09-technologia']}];
const body={title:'Empty input loses the validation result',classification:'defect',language:'en',componentId:uuid(2),taskId:uuid(3),requesterId:uuid(20),recipientId:uuid(22),scope:'One parser validation result',excluded:'Other application components',observed:'Empty input throws an exception',expected:'Empty input returns a typed validation result',impact:'The form cannot explain the error',knownRisk:'low',decisionNeed:'none',requiredCompetencies:['javascript'],sources:[refs[2]],evidence:[refs[3]],environment:{key:'fixture',build:'fixture-build',applicationRevision:revision,componentRevision:revision,contextRevision:revision},reproducibility:{status:'intermittent',steps:['Open the form','Submit empty input'],limitations:'Synthetic local evidence'}};
const authority=i=>({status:'delegated',principal:workers[i].principal,mandate:{id:uuid(30+i)},path:workers.map(worker=>worker.id)});
let checked=0;
try{
 for(const locale of ['pl','en'])for(const width of [390,834,1440])for(const state of ['observed','triage_pending','inconclusive','deferred','empty','error']){
  const page=await browser.newPage({viewport:{width,height:960}}),errors=[],writes=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(value=>localStorage.setItem('companycoreLocale',value),locale);
  const detail={expectedVersion:revision,version:{id:uuid(41),version:1,body,fingerprint:revision,actorKind:'user',actorId:uuid(21)},state,verification:null,verificationCurrent:state==='triage_pending',verifyAuthority:authority(0),triageAuthority:authority(1),history:[],versions:[],occurrences:[],mergeCandidates:[],grants:[],blockers:[],truncated:false,canManageGrants:true,credentialOptions:[],deferrals:[{id:uuid(50),explanation:'Wait for restored budget',condition:{type:'owner_signal'}}],output:null};
  await page.route('**/v1/**',route=>{
   const req=route.request();if(req.method()!=='GET'){writes.push(req.postDataJSON());return route.fulfill({json:{data:{record:{id:uuid(40)}}}});}
   if(state==='error')return route.fulfill({status:503,json:{error:'server_error'}});
   const url=req.url();return route.fulfill({json:{data:url.endsWith('/catalog')?{workspaceId:uuid(90),application:{id:uuid(1),name:'Atlas portal'},canonicalLanguage:'en',records:refs,workforce:workers,truncated:false}:url.endsWith('/findings')?{items:state==='empty'?[]:[{id:uuid(40),title:body.title,classification:body.classification,state,scope:body.scope,version:1,occurrences:0}]}:detail}});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  if(state==='error')await page.getByText('server_error',{exact:true}).waitFor();
  else if(state==='empty')await page.getByText(locale==='pl'?'Brak zgłoszeń dla tej aplikacji.':'No findings for this application.').waitFor();
  else{await page.getByRole('button',{name:new RegExp(body.title)}).click();await page.getByRole('heading',{name:body.title}).waitFor();}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${locale}/${width}/${state} overflow`);
  if(['observed','triage_pending','deferred','inconclusive'].includes(state)){
   await page.screenshot({path:path.join(output,`${locale}-${width}-${state}.png`),fullPage:true});
   await page.getByRole('button',{name:locale==='pl'?'Popraw wersję':'Revise finding',exact:true}).count().then(async count=>{if(count){await page.getByRole('button',{name:locale==='pl'?'Popraw wersję':'Revise finding',exact:true}).click();}});
  }
  if(state==='empty'){
   await page.getByRole('button',{name:locale==='pl'?'Nowe zgłoszenie':'New finding',exact:true}).click();
   const form=page.locator('form');
   for(const [name,value] of Object.entries({title:body.title,scope:body.scope,excluded:body.excluded,observedBehavior:body.observed,expected:body.expected,steps:'Open the form\nSubmit empty input',limitations:body.reproducibility.limitations,impact:body.impact,environment:'fixture',build:'b',competencies:'javascript'}))await form.locator(`[name="${name}"]`).fill(value);
   for(const [name,value] of Object.entries({classification:'defect',component:uuid(2),sourceTask:uuid(3),requester:uuid(20),recipient:uuid(22),reproducibility:'intermittent',risk:'low',decisionNeed:'none'}))await form.locator(`[name="${name}"]`).selectOption(value);
   await form.locator('[name="source"]').first().check();await form.locator('[name="source"]').nth(1).check();await form.locator('[name="evidence"]').check();
   await form.getByRole('button',{name:locale==='pl'?'Zapisz':'Save',exact:true}).click();
   await page.waitForFunction(()=>!document.querySelector('form'));
   assert.equal(writes.length,1);assert.equal(writes[0].body.sources.length,2);assert.equal(writes[0].body.reproducibility.status,'intermittent');assert.equal(writes[0].body.language,'en');
  }
  assert.deepEqual(errors,[]);await page.close();checked++;
 }
 console.log(`Finding UI: ${checked} PL/EN responsive states passed; screenshots in ${output}`);
}finally{await browser.close();server.close();await once(server,'close');}
