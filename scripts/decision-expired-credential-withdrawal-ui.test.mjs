import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {mkdir,readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {build} from 'esbuild';
import {chromium} from 'playwright';

const output=path.join(os.tmpdir(),'roost-expired-credential-withdrawal-ui');
await mkdir(output,{recursive:true});
const decisionId='11111111-1111-4111-8111-111111111111';
const taskId='22222222-2222-4222-8222-222222222222';
const handoffId='33333333-3333-4333-8333-333333333333';
const version='a'.repeat(64),digest='b'.repeat(64);
const bundle=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{DecisionGovernanceModal}from'./web/src/features/departments/decision-governance';createRoot(document.getElementById('root')).render(<LanguageProvider><DecisionGovernanceModal decisionId='${decisionId}' onClose={()=>{document.body.dataset.closed='true'}}/></LanguageProvider>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,jsx:'automatic',define:{'process.env.NODE_ENV':'"test"'}});
const cssName=(await readdir('public/react/assets')).find(name=>/^index-.*\.css$/.test(name));
assert.ok(cssName,'built web CSS is required');
const css=await readFile(path.join('public/react/assets',cssName));
const server=createServer((req,res)=>{
 if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');return res.end(bundle.outputFiles[0].contents);}
 if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');return res.end(css);}
 res.setHeader('Content-Type','text/html');res.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body class="bg-base-200"><div id="root"></div><script src="/app.js"></script></body></html>');
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const browser=await chromium.launch({headless:true});
let checks=0;
try{
 for(const locale of ['pl','en'])for(const width of [390,1440])for(const mode of ['eligible','blocked','missing','readonly','stale','stale-changed','unrelated','legacy']){
  const pl=locale==='pl';
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  const errors=[],writes=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(value=>localStorage.setItem('companycoreLocale',value),locale);
  let state=mode==='legacy'?'withdrawn':'pending',postAttempt=0,currentVersion=version,currentDigest=digest,detailReads=0;
  const preview=()=>({eligible:!['blocked','missing'].includes(mode),blockers:mode==='blocked'?['active_task','active_execution']:mode==='missing'?['handoff_missing','impact_unavailable']:[],previewDigest:currentDigest,impact:mode==='missing'?null:{taskIds:[taskId]},handoff:mode==='missing'?null:{id:handoffId,state:'requested',expired:true},taskStates:mode==='missing'?[]:[{id:taskId,title:'Synthetic rotation task',status:mode==='blocked'?'todo':'archived'}]});
  const root=()=>({expectedVersion:currentVersion,canWrite:mode!=='readonly',canAccept:false,authorityCatalog:{workforce:[],departments:[]},catalog:[],resourceCatalog:[],configurationCatalog:[],revisions:[],deferrals:[]});
  const detail=()=>({...root(),selected:{decisionId,version:1,state,body:{title:'Synthetic credential rotation',context:'Synthetic context',decision:'Rotate the synthetic credential',rationale:'Synthetic evidence',scopeReason:'One synthetic task',consequences:'Retain history',conflicts:[],workerCredential:['unrelated','legacy'].includes(mode)?undefined:{action:'rotate'}}},current:true,impact:{nodes:[{type:'task',id:taskId,title:'Synthetic rotation task'}],taskIds:[taskId],contexts:[],grants:[],handoffs:[],interviews:[]},previews:[],acceptance:null,ancestors:[],supersededBy:[],taskStates:[{id:taskId,title:'Synthetic rotation task',status:mode==='blocked'?'todo':'archived',executionReadiness:{status:'needs_revalidation'}}],gates:[],credentialWithdrawal:['unrelated','legacy'].includes(mode)||state==='withdrawn'?null:preview(),withdrawal:state==='withdrawn'?{id:handoffId,kind:mode==='legacy'?'managed_information_successor':'expired_worker_rotation',impactDigest:mode==='legacy'?null:currentDigest,withdrawnAt:'2026-10-15T03:00:00Z',reason:'Synthetic owner reason'}:null});
  await page.route('**/v1/**',route=>{
   const request=route.request(),url=new URL(request.url());
   if(request.method()==='GET'){if(url.pathname===`/v1/decisions/${decisionId}/governance`)detailReads++;return route.fulfill({json:{data:url.pathname===`/v1/decisions/${decisionId}/governance`?detail():root()}});}
   if(url.pathname==='/v1/auth/reauth'){
    const body=request.postDataJSON();writes.push({path:url.pathname,body});
    assert.equal(body.method,'POST');assert.equal(body.path,`/v1/decisions/${decisionId}/governance/expired-credential-withdrawals`);
    assert.match(body.bodyDigest,/^[a-f0-9]{64}$/);
    return route.fulfill({json:{data:{proof:'synthetic-owner-proof'}}});
   }
   if(url.pathname===`/v1/decisions/${decisionId}/governance/expired-credential-withdrawals`){
    postAttempt++;
    const body=request.postDataJSON();writes.push({path:url.pathname,body,proof:request.headers()['x-owner-action-proof']});
    if(mode==='stale'||mode==='stale-changed'&&postAttempt===1){
     if(mode==='stale-changed'){currentVersion='d'.repeat(64);currentDigest='c'.repeat(64);}
     return route.fulfill({status:409,json:{error:'decision_withdrawal_stale'}});
    }
    state='withdrawn';return route.fulfill({json:{data:{record:{id:handoffId,decisionId,requestId:body.requestId,withdrawnAt:'2026-10-15T03:00:00Z'},replayed:false}}});
   }
   writes.push({path:url.pathname});return route.fulfill({status:405,json:{error:'unexpected_write'}});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.getByRole('heading',{name:'Synthetic credential rotation'}).waitFor();
  const action=page.getByRole('button',{name:pl?'Wycofaj wygasłą rotację':'Withdraw expired rotation'});
  if(mode==='unrelated'||mode==='legacy'){
   assert.equal(await action.count(),0);
   if(mode==='legacy'){
    await page.getByText(pl?'Wycofanie przez właściciela':'Owner withdrawal').waitFor();
    assert.equal(await page.getByText('expired_worker_rotation').count(),0);
    assert.equal(await page.getByText(pl?'Odcisk wpływu':'Impact digest').count(),0);
   }
  }else{
   const scope=page.getByRole('heading',{name:pl?'Wygasła rotacja poświadczenia Workera':'Expired Worker credential rotation'}).locator('..').locator('..');
   if(mode!=='missing'){
    await scope.getByText(taskId).waitFor();
    await scope.getByText(handoffId).waitFor();
   }
   await scope.getByText(digest).waitFor();
   if(mode==='blocked'||mode==='eligible'){
    await scope.scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(output,`credential-${locale}-${width}-${mode}.png`),fullPage:true});
   }
   if(mode==='blocked'||mode==='missing'||mode==='readonly'){
    assert.equal(await action.isDisabled(),true);
    if(mode==='blocked'){
     await scope.getByText(pl?'Powiązane zadanie jest aktywne.':'A linked task is active.').waitFor();
     await scope.getByText(pl?'Powiązane wykonanie jest aktywne.':'A linked execution is active.').waitFor();
    }else if(mode==='missing'){
     await scope.getByText(pl?'Brak powiązanego przekazania poświadczenia.':'The linked credential handoff is missing.').waitFor();
     await scope.getByText(pl?'Nie można ustalić pełnego wpływu.':'The complete impact cannot be determined.').waitFor();
     await scope.getByText(pl?'Nie można ustalić zakresu zadań.':'Task impact is unavailable.').waitFor();
    }
    assert.deepEqual(writes,[]);
   }else{
    assert.equal(await action.isEnabled(),true);
    await action.press('Enter');
    const dialog=page.locator('[data-credential-confirm]');await dialog.waitFor();
    assert.equal(await dialog.getAttribute('aria-modal'),'true');
    assert.equal(await dialog.getAttribute('aria-labelledby'),'credential-withdrawal-title');
    assert.equal(await dialog.getAttribute('aria-describedby'),'credential-withdrawal-description');
    await page.waitForFunction(()=>document.activeElement===document.querySelector('[data-credential-confirm] textarea'));
    if(mode==='eligible'){
     const close=dialog.getByRole('button',{name:pl?'Zamknij potwierdzenie':'Close confirmation'});
     const cancel=dialog.getByRole('button',{name:pl?'Anuluj':'Cancel'});
     await close.focus();await page.keyboard.press('Shift+Tab');
     assert.equal(await cancel.evaluate(element=>element===document.activeElement),true,'Shift+Tab wraps to last enabled action');
     await page.keyboard.press('Tab');
     assert.equal(await close.evaluate(element=>element===document.activeElement),true,'Tab wraps to close control');
     await page.keyboard.press('Escape');
     assert.equal(await dialog.count(),0,'Escape closes only the confirmation');
     assert.equal(await page.getByRole('heading',{name:'Synthetic credential rotation'}).count(),1,'decision editor remains open');
     assert.deepEqual(writes,[]);
     await action.press('Enter');await dialog.waitFor();
     await cancel.click();
     assert.equal(await dialog.count(),0,'localized cancel closes without a write');
     await action.press('Enter');await dialog.waitFor();
    }
    await dialog.getByText(decisionId).waitFor();
    await dialog.getByText(taskId).waitFor();
    const confirm=dialog.getByRole('button',{name:pl?'Wycofaj tę rotację':'Withdraw this rotation'});
    assert.equal(await confirm.isDisabled(),true);
    await dialog.getByLabel(pl?'Powód wycofania':'Withdrawal reason').fill('short');
    await dialog.getByLabel(pl?'Hasło właściciela':'Owner password').fill('synthetic-password');
    assert.equal(await confirm.isDisabled(),true,'reason under 12 characters cannot be submitted');
    await dialog.getByLabel(pl?'Powód wycofania':'Withdrawal reason').fill('Synthetic owner reason');
    await confirm.waitFor({state:'visible'});
    assert.equal(await confirm.isEnabled(),true,'owner can confirm after reason and password');
    if(mode==='eligible')await page.screenshot({path:path.join(output,`credential-${locale}-${width}-confirmation.png`),fullPage:true});
    await confirm.press('Enter');
    if(mode==='eligible')await dialog.waitFor({state:'detached'});
    else await dialog.getByText(pl?'Podgląd jest nieaktualny':'Preview is stale').waitFor();
    assert.equal(postAttempt,1);
    assert.equal(writes.length,2);
    assert.equal(writes[1].proof,'synthetic-owner-proof');
    assert.equal(writes[1].body.expectedVersion,version);
    assert.equal(writes[1].body.expectedPreviewDigest,digest);
    assert.equal(writes[1].body.reason,'Synthetic owner reason');
    assert.match(writes[1].body.requestId,/^[a-f0-9-]{36}$/);
    if(mode==='eligible'){
     await page.getByText(pl?'Wycofano wygasłą rotację Workera':'Expired Worker rotation withdrawn').waitFor();
     await page.getByText('expired_worker_rotation').waitFor();
     await page.getByText(currentDigest).waitFor();
     await page.getByText(handoffId).waitFor();
     assert.equal(await action.count(),0);
    }else{
     assert.equal(await dialog.getByLabel(pl?'Hasło właściciela':'Owner password').inputValue(),'');
     assert.equal(await dialog.getByLabel(pl?'Powód wycofania':'Withdrawal reason').inputValue(),'Synthetic owner reason');
     await dialog.getByLabel(pl?'Hasło właściciela':'Owner password').fill('synthetic-password');
     assert.equal(await confirm.isDisabled(),true,'stale preview cannot be retried before refresh');
     assert.equal(writes.length,2);
     const readsBeforeRefresh=detailReads;
     await dialog.getByRole('button',{name:pl?'Odśwież podgląd i wróć':'Refresh preview and return'}).press('Enter');
     await dialog.waitFor({state:'detached'});
     assert.equal(detailReads,readsBeforeRefresh+1,'in-dialog recovery reloads current governance detail');
     await scope.getByText(currentDigest).waitFor();
     assert.equal(await action.isEnabled(),true);
     await action.press('Enter');await dialog.waitFor();
     assert.equal(await dialog.getByLabel(pl?'Hasło właściciela':'Owner password').inputValue(),'');
     assert.equal(await dialog.getByLabel(pl?'Powód wycofania':'Withdrawal reason').inputValue(),'Synthetic owner reason');
     await dialog.getByLabel(pl?'Hasło właściciela':'Owner password').fill('synthetic-password');
     await page.waitForFunction(()=>document.querySelector('[data-credential-confirm] footer button.btn-error')?.disabled===false);
     assert.equal(await confirm.isEnabled(),true,`${locale}/${width}/${mode}: refreshed confirmation should be enabled`);
     await confirm.press('Enter');
     if(mode==='stale-changed')await dialog.waitFor({state:'detached'});
     else await dialog.getByText(pl?'Podgląd jest nieaktualny':'Preview is stale').waitFor();
     assert.equal(postAttempt,2);
     assert.equal(writes[3].body.expectedVersion,currentVersion);
     assert.equal(writes[3].body.expectedPreviewDigest,currentDigest);
     if(mode==='stale'){
      assert.equal(writes[1].body.requestId,writes[3].body.requestId,'unchanged refreshed request retains its ID');
      assert.equal(await confirm.isDisabled(),true);
     }else{
      assert.notEqual(writes[1].body.requestId,writes[3].body.requestId,'changed preview uses a new request ID');
      await page.getByText(pl?'Wycofano wygasłą rotację Workera':'Expired Worker rotation withdrawn').waitFor();
      await page.getByText(currentDigest).waitFor();
     }
    }
   }
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${locale}/${width}/${mode}: horizontal overflow`);
  assert.deepEqual(errors,[],`${locale}/${width}/${mode}: browser errors`);
  await page.close();checks++;
 }
}finally{await browser.close();server.close();await once(server,'close');}
console.log(`Expired credential withdrawal UI checks passed: ${checks}`);
