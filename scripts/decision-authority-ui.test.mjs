import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {mkdir,readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {build} from 'esbuild';
import {chromium} from 'playwright';
const output=path.join(os.tmpdir(),'roost-decision-authority-ui');await mkdir(output,{recursive:true});
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const bundle=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{DelegatedMandatesModal,DecisionAuthorityDetails}from'./web/src/features/departments/decision-authority';createRoot(document.getElementById('root')).render(<LanguageProvider><DelegatedMandatesModal onClose={()=>{document.body.dataset.closed='true'}}/></LanguageProvider>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,jsx:'automatic',define:{'process.env.NODE_ENV':'"test"'}});
const css=(await readdir('public/react/assets')).find(n=>/^index-.*\.css$/.test(n)),cssContent=await readFile(path.join('public/react/assets',css));
const server=createServer((req,res)=>{if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');return res.end(bundle.outputFiles[0].text);}if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');return res.end(cssContent);}res.setHeader('Content-Type','text/html');res.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body><div id="root"></div><script src="/app.js"></script></body></html>');});
server.listen(0,'127.0.0.1');await once(server,'listening');const browser=await chromium.launch({headless:true});let checks=0;
try{
 for(const locale of ['pl','en'])for(const width of [390,834,1440])for(const mode of ['create','history','readonly','error','loading','dirty']){
  const pl=locale==='pl',page=await browser.newPage({viewport:{width,height:980}}),errors=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(locale=>localStorage.setItem('companycoreLocale',locale),locale);
  const holder={kind:'user',id:id(2)},mandate={id:id(3),versionId:id(4),workforceId:id(5),workspaceId:id(1),version:1,holder,issuer:{kind:'user',id:id(6)},departmentKey:'09-technologia',entities:[{type:'task',id:id(7)}],decisionDomains:['ordinary_domain'],operations:['accept_decision'],exclusions:[],exclusionReason:'Only the declared parser task',maxRisk:'medium',startsAt:'2026-09-08T10:00:00Z',endsAt:'2026-09-09T10:00:00Z',status:'active',sourceDecisionId:id(8),reason:'Decide the evidenced parser output',createdAt:'2026-09-08T10:00:00Z'};
  let rows=['history','readonly'].includes(mode)?[mandate]:[];
  const view=()=>({expectedVersion:'a'.repeat(64),canWrite:mode!=='readonly',ownerUserId:id(6),mandates:rows,history:rows,workforce:[{id:id(5),name:'Technology decision maker',active:true,principal:holder,departmentKeys:['09-technologia']}],departments:[{key:'09-technologia',name:'Technology'}],sources:[{id:id(8),title:'First owner mandate Decision'},{id:id(9),title:'Owner scope renewal'}],entityCatalog:[{type:'task',id:id(7),name:'Parser delivery fixture'}],truncated:false});
  await page.route('**/v1/decisions/mandates',async route=>{
   if(mode==='loading'){await new Promise(r=>setTimeout(r,700));return route.fulfill({json:{data:view()}});}
   if(route.request().method()==='POST'){
    const body=route.request().postDataJSON();writes.push(body);
    if(mode==='error')return route.fulfill({status:409,json:{error:'decision_authority_stale'}});
    rows=[{...mandate,...body.body,version:mode==='history'?2:1,versionId:id(10)}];
    return route.fulfill({status:201,json:{data:{record:{id:mandate.id,version:rows[0].version}}}});
   }return route.fulfill({json:{data:view()}});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/?${mode}`);
  await page.getByRole('dialog').waitFor();
  const save=page.getByRole('button',{name:pl?'Zapisz wersję mandatu':'Record mandate version',exact:true});
  if(mode==='loading'){await page.getByText(pl?'Wczytywanie mandatów…':'Loading mandates…',{exact:true}).waitFor();assert.equal(await save.isDisabled(),true);checks++;await page.getByText(pl?'Brak delegowanych mandatów.':'No delegated mandates.',{exact:true}).waitFor();}
  else if(mode==='readonly'){
   await page.getByText(pl?'Mandaty może zmieniać tylko aktualny właściciel.':'Only the current owner may change mandates.',{exact:true}).waitFor();
   await page.getByRole('button',{name:pl?'Pokaż / następna wersja':'Inspect / next version',exact:true}).click();
   assert.equal(await save.isDisabled(),true);assert.equal(await page.getByLabel(pl?'Stan':'Status',{exact:true}).isDisabled(),true);assert.equal(writes.length,0);checks+=3;
  }else if(mode!=='loading'){
   if(mode==='history')await page.getByRole('button',{name:pl?'Pokaż / następna wersja':'Inspect / next version',exact:true}).click();
   else{
    await page.getByLabel(pl?'Posiadacz mandatu':'Mandate holder',{exact:false}).selectOption(id(5));
    await page.getByLabel(pl?'Dział':'Department',{exact:false}).selectOption('09-technologia');
    await page.getByLabel(pl?'Rekord w zakresie':'Scope record',{exact:true}).selectOption(id(7));
    await page.getByRole('button',{name:pl?'Dodaj do zakresu':'Add to scope',exact:true}).click();
    await page.getByLabel(pl?'Ważny od (czas lokalny)':'Valid from (local time)',{exact:false}).fill('2026-09-08T10:00');
    await page.getByLabel(pl?'Opis wyłączeń':'Exclusions explanation',{exact:false}).fill('Only the declared task');
   }
   if(mode==='dirty'){
    await page.getByRole('button',{name:pl?'Wróć':'Back',exact:true}).click();
    await page.getByRole('heading',{name:pl?'Odrzucić niezapisane zmiany?':'Discard unsaved changes?',exact:true}).waitFor();
    assert.equal(writes.length,0);checks++;
   }else{
    await page.getByLabel(pl?'Zaakceptowana decyzja o zmianie mandatu':'Accepted mandate-change Decision',{exact:false}).selectOption(id(9));
    await page.getByLabel(pl?'Uzasadnienie zmiany':'Reason for change',{exact:false}).fill('Owner approved this exact mandate version');
    if(mode==='history')await page.getByLabel(pl?'Stan':'Status',{exact:true}).selectOption('revoked');
    await save.click();
    await page.getByText(mode==='error'?(pl?'Nie zapisano mandatu. Odśwież uprawnienia i sprawdź źródłową decyzję.':'Mandate not recorded. Refresh authority and check the source Decision.'):(pl?'Zapisano wersję mandatu.':'Mandate version recorded.'),{exact:true}).waitFor();
    assert.equal(writes.length,1);assert.deepEqual(writes[0].body.holder,holder);assert.deepEqual(writes[0].body.entities,mandate.entities);assert.equal(writes[0].body.sourceDecisionId,id(9));
    assert.equal(writes[0].body.status,mode==='history'?'revoked':'active');checks+=5;
    if(mode!=='error'){assert.equal(await save.isDisabled(),true);checks++;}
   }
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);checks+=2;
  await page.screenshot({path:path.join(output,`authority-${locale}-${width}-${mode}.png`),fullPage:true});await page.close();
 }
 console.log(`Decision authority UI: ${checks} checks passed`);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
