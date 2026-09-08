import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {mkdir,readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {build} from 'esbuild';
import {chromium} from 'playwright';
const output=path.join(os.tmpdir(),'roost-decision-governance-ui');await mkdir(output,{recursive:true});
const id='00000000-0000-4000-8000-000000000001',task='00000000-0000-4000-8000-000000000002',hash='a'.repeat(64);
const bundle=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{TaskInterviewModal}from'./web/src/features/departments/task-interview';import{DecisionGovernanceModal,DecisionDeferralModal}from'./web/src/features/departments/decision-governance';const create=location.search.includes('create');createRoot(document.getElementById('root')).render(<LanguageProvider>{location.search.includes('interview-reopen')?<TaskInterviewModal taskId='${task}' onClose={()=>{document.body.dataset.closed='true'}}/>:location.search.includes('reopen')?<DecisionDeferralModal targetType='interview' targetId='${id}' review onClose={()=>{document.body.dataset.closed='true'}}/>:<DecisionGovernanceModal decisionId={create?undefined:'${id}'} onClose={()=>{document.body.dataset.closed='true'}}/>}</LanguageProvider>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,jsx:'automatic',define:{'process.env.NODE_ENV':'"test"'}});
const css=(await readdir('public/react/assets')).find(n=>/^index-.*\.css$/.test(n)),cssContent=await readFile(path.join('public/react/assets',css));
const server=createServer((req,res)=>{if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');return res.end(bundle.outputFiles[0].text);}if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');return res.end(cssContent);}res.setHeader('Content-Type','text/html');res.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body><div id="root"></div><script src="/app.js"></script></body></html>');});
server.listen(0,'127.0.0.1');await once(server,'listening');const browser=await chromium.launch({headless:true});let checks=0;
try{
 for(const locale of ['pl','en'])for(const width of [390,768,1440])for(const mode of ['create','accept','stale','readonly','defer','reopen','interview-reopen']){
  const pl=locale==='pl',page=await browser.newPage({viewport:{width,height:980}}),errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(locale=>localStorage.setItem('companycoreLocale',locale),locale);
  let state='pending',current=mode!=='stale',reopened=false;
  const body={title:'Parser delivery decision',context:'Two evidenced alternatives',decision:'Deliver the narrow behavior',rationale:'Keep changes focused',scopeReason:'Only the parser task depends on this choice',consequences:'Revalidate the affected parser work',scope:[{type:'task',id:task}],conflicts:[{kind:'narrows',oldProvision:'Deliver the broad behavior',newProvision:'Deliver the narrow behavior',explanation:'Narrow the affected behavior'}]};
  const impact={nodes:[{type:'task',id:task,title:'Parser fixture task'}],taskIds:[task],contexts:[{type:'project',id:task,title:'Fixture project',effect:'context'}],grants:[{id}],handoffs:[{id}],interviews:[{id}]};
  const root=()=>({expectedVersion:hash,canWrite:mode!=='readonly',canAccept:mode!=='readonly',authorityCatalog:{workforce:[],departments:[{key:'09-technologia',name:'Technology'}]},catalog:[{type:'task',id:task,title:'Parser fixture task'}],resourceCatalog:[{id:task,name:'Fixture capacity'}],configurationCatalog:[],revisions:[{id,title:body.title,state}],deferrals:mode.includes('reopen')?[{id:task,targetId:id,targetType:'interview',reason:'budget',explanation:'Wait for confirmed capacity',condition:{type:'owner_signal'},...(reopened?{eventId:id,reopenedAt:'2026-09-08T11:00:00Z'}:{})}]:[],truncated:false});
  const detail=()=>({...root(),selected:{decisionId:id,version:2,state,body},impact,current,previews:[{id,version:1,createdAt:'2026-09-08T10:00:00Z',impact}],acceptance:state==='accepted'?{createdAt:'2026-09-08T11:00:00Z'}:null,ancestors:[{id:task,title:'Previous parser decision',decision:'Deliver the broad behavior'}],taskStates:[{id:task,title:'Parser fixture task',executionReadiness:{status:state==='accepted'?'needs_revalidation':'ready'}}],gates:[{taskId:task,seal:hash,gates:[]}]});
  await page.route('**/v1/**',async route=>{if(route.request().method()==='POST'){const b=route.request().postDataJSON();writes.push(b);if(b.action==='accept')state='accepted';if(b.action==='review_impact')current=true;if(b.condition)state='deferred';if(b.deferralId)reopened=true;return route.fulfill({json:{data:{record:{id}}}});}if(route.request().url().includes('/interviews'))return route.fulfill({json:{data:{expectedVersion:hash,canPrepare:false,ownerIds:[],sources:[],blocking:true,cases:[{id,version:1,status:'deferred',current:false,canRespond:false,entries:[],body:{...body,scope:'Only the fixture task',topic:'Capacity choice',questions:[],dependencies:[],gathering:{checkedSources:[]}}}]}}});return route.fulfill({json:{data:route.request().url().includes('/'+id+'/governance')?detail():root()}});});
  await page.goto(`http://127.0.0.1:${server.address().port}/?${mode}`);
  await page.getByRole('dialog').waitFor();
  if(mode==='create'){
   await page.getByLabel(pl?'Dziedzina decyzji':'Decision domain',{exact:false}).selectOption('product_direction');
   await page.getByLabel(pl?'Odpowiedzialny dział':'Accountable department',{exact:false}).selectOption('09-technologia');
   for(const [name,value] of [[pl?'Tytuł':'Title',body.title],[pl?'Kontekst':'Context',body.context],[pl?'Nowe postanowienie':'New provision',body.decision],[pl?'Uzasadnienie propozycji':'Proposal rationale',body.rationale],[pl?'Konsekwencje':'Consequences',body.consequences],[pl?'Dlaczego ten zakres jest najwęższy':'Why this scope is the narrowest',body.scopeReason]])await page.getByLabel(name,{exact:false}).fill(value);
   await page.getByLabel(pl?'Zadanie objęte decyzją':'Task covered by the decision',{exact:false}).selectOption(task);
   await page.getByRole('button',{name:pl?'Zapisz propozycję':'Record proposal',exact:true}).click();await page.getByRole('heading',{name:body.title,exact:true}).waitFor();assert.deepEqual(writes[0].scope,[{type:'task',id:task}]);checks++;
  }else if(mode.includes('reopen')){
   if(mode==='interview-reopen')await page.getByRole('button',{name:pl?'Sprawdź warunek powrotu':'Review reopening condition',exact:true}).click();
   await page.getByLabel(pl?'Potwierdzenie rzeczywistego zdarzenia':'Confirmation of the actual event').fill('Owner explicitly confirms the scoped event');
   await page.getByRole('button',{name:pl?'Potwierdź zdarzenie i otwórz ponownie':'Confirm event and reopen',exact:true}).click();await page.getByText(/^(Ponownie otwarto|Reopened) ·/).waitFor();assert.equal(writes[0].type,'owner_signal');assert.equal(writes[0].deferralId,task);checks+=2;
  }else{
   await page.getByRole('heading',{name:body.title,exact:true}).waitFor();
   if(mode==='readonly'){assert.equal(await page.getByRole('button',{name:pl?'Przejrzyj i zaakceptuj':'Review and accept',exact:true}).count(),0);checks++;}
   if(mode==='stale'){assert.equal(await page.getByRole('button',{name:pl?'Przejrzyj i zaakceptuj':'Review and accept',exact:true}).isDisabled(),true);await page.getByRole('button',{name:pl?'Zapisz aktualny przegląd wpływu':'Record current impact review',exact:true}).click();assert.equal(writes[0].action,'review_impact');checks++;}
   if(mode==='accept'){await page.getByRole('button',{name:pl?'Przejrzyj i zaakceptuj':'Review and accept',exact:true}).click();assert.equal(writes.length,0);await page.getByRole('button',{name:pl?'Akceptuję wskazany zakres':'Accept the listed scope',exact:true}).click();await page.getByText(pl?'Wymaga ponownej walidacji':'Revalidation required',{exact:true}).waitFor();assert.equal(writes[0].previewId,id);checks+=2;}
   if(mode==='defer'){await page.getByRole('button',{name:pl?'Odrocz':'Defer',exact:true}).click();await page.getByLabel(pl?'Warunek ponownego otwarcia':'Reopening condition',{exact:true}).selectOption('resource_available');await page.getByLabel(pl?'Powiązany rekord':'Linked record',{exact:false}).selectOption(task);await page.getByLabel(pl?'Uzasadnienie odroczenia':'Deferral explanation',{exact:false}).fill('Wait for verified fixture capacity');await page.getByRole('button',{name:pl?'Zapisz odroczenie':'Record deferral',exact:true}).click();await page.getByRole('heading',{name:body.title,exact:true}).waitFor();assert.deepEqual(writes[0].condition,{type:'resource_available',referenceId:task});checks++;}
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);checks++;
  assert.deepEqual(errors,[]);checks++;
  if(['accept','stale','create','reopen','interview-reopen'].includes(mode))await page.screenshot({path:path.join(output,`decision-${locale}-${width}-${mode}.png`),fullPage:true});
  await page.close();
 }
 console.log(`Decision governance UI: ${checks} checks passed`);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
