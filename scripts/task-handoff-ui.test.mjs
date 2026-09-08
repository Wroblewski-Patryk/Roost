import assert from "node:assert/strict";
import {createServer} from "node:http";
import {once} from "node:events";
import {mkdir,readFile,readdir} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {build} from "esbuild";
import {chromium} from "playwright";
const output=path.join(os.tmpdir(),"roost-handoff-ui");await mkdir(output,{recursive:true});
const bundle=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{TaskHandoffModal}from'./web/src/features/departments/task-handoff';createRoot(document.getElementById('root')).render(<LanguageProvider><TaskHandoffModal taskId="00000000-0000-4000-8000-000000000001" onClose={()=>{document.body.dataset.closed='true'}}/></LanguageProvider>);`,resolveDir:process.cwd(),loader:"tsx"},bundle:true,write:false,jsx:"automatic",define:{"process.env.NODE_ENV":'"test"'}});
const css=(await readdir("public/react/assets")).find(n=>/^index-.*\.css$/.test(n));
const cssContent=await readFile(path.join("public/react/assets",css));
const server=createServer(async(req,res)=>{
 if(req.url==="/app.js"){res.setHeader("Content-Type","text/javascript");return res.end(bundle.outputFiles[0].text);}
 if(req.url==="/style.css"){res.setHeader("Content-Type","text/css");return res.end(cssContent);}
 res.setHeader("Content-Type","text/html");res.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body><div id="root"></div><script src="/app.js"></script></body></html>');
});server.listen(0,"127.0.0.1");await once(server,"listening");
const browser=await chromium.launch({headless:true}),id="00000000-0000-4000-8000-000000000001",other="00000000-0000-4000-8000-000000000002",hash="a".repeat(64);
const content={outcome:{summary:"Synthetic parser result",currentState:"Completed fixture"},decisions:{explanation:"Current recorded mandates"},changes:{areas:["Parser input"]},tests:{assessment:"Recorded fixture test passed"},limits:{knownLimitations:"No external checks",residualRisks:"Production remains untested"},continuation:{reproduce:"Run isolated parser fixture",continue:"Inspect reported paths",rollback:"Revert the isolated change"},expectedAction:{kind:"inspect",instruction:"Acknowledge this exact result"}};
const source={workspaceId:id,taskId:id,applicationId:id,executionId:id,attempt:1,materialVersion:hash,packetRevision:hash,contextRevision:hash,compositionSeal:hash,riskAssessmentId:id,riskAdmissionSeal:hash,baseCommit:"c".repeat(40),workingTree:"dirty",resultRevision:{id,executionId:id,commit:"b".repeat(40),workingTree:"dirty"},commit:"b".repeat(40),branch:`codex/task-${id}`,changedPaths:["src/parser.ts"],tests:{kind:"execution_verification",executionId:id,revision:hash,state:"reported",commands:[{index:0,command:"npm test -- parser",reportedStatus:"completed",exitCode:0}]},evidence:[{evidenceId:id,version:1,status:"present"}],mandates:[{id,authorityScope:["task_verification"]}]};
const record={id,version:1,source,content,senderRole:"executor",recipientRole:"verifier",sender:{kind:"agent",id},recipient:{kind:"user",id:other},current:true,createdAt:"2026-09-08T09:00:00Z",canAccept:true,canReject:true,decision:null};
const fieldLabels={en:["Outcome","Current state","Current decisions and mandates — explanation","Changed areas (one per line)","Assessment of recorded tests","Known limitations","Residual risks","How to reproduce","How to continue","How to roll back","Expected recipient action"],pl:["Wynik","Aktualny stan","Aktualne decyzje i mandaty — objaśnienie","Zmienione obszary (po jednym w wierszu)","Ocena zapisanych testów","Znane ograniczenia","Ryzyko resztkowe","Jak odtworzyć","Jak kontynuować","Jak wycofać","Oczekiwana czynność odbiorcy"]};
let checks=0;
try{
 for(const locale of ["pl","en"])for(const width of [390,1440])for(const mode of ["create","accept","reject","stale"]){
  const page=await browser.newPage({viewport:{width,height:960}}),errors=[],posts=[];page.setDefaultTimeout(8000);page.on("pageerror",e=>errors.push(e.message));
  await page.addInitScript(locale=>localStorage.setItem("companycoreLocale",locale),locale);
  let fail=true,data={task:{id,title:"Synthetic parser task"},expectedVersion:hash,sourceVersion:hash,source,senderRoles:mode==="create"?[{role:"executor",principal:{kind:"agent",id},label:"Fixture executor"}]:[],recipients:[{role:"verifier",principal:{kind:"user",id:other},label:"Fixture reviewer"}],operations:{handoff_create:true,handoff_accept:true,handoff_reject:true},missing:mode==="stale"?["current_source"]:[],canCreate:mode==="create",history:mode==="create"?[]:[{...record,current:mode!=="stale",canAccept:mode!=="stale",canReject:mode!=="stale"}],nextCursor:null};
  await page.route("**/v1/**",async route=>{
   if(route.request().method()==="GET")return route.fulfill({json:{data}});
   const body=route.request().postDataJSON();posts.push(body);
   if(mode==="create"&&fail){fail=false;return route.fulfill({status:409,json:{error:"task_handoff_stale"}});}
   if(mode==="create")data={...data,canCreate:false,history:[{...record,content:body.content,canAccept:false,canReject:false}]};
   else data={...data,history:[{...record,canAccept:false,canReject:false,decision:{decision:mode,detail:mode==="reject"?{code:body.code,reason:body.reason,sections:body.sections}:{}}}]};
   return route.fulfill({status:201,json:{data:{record:{id},replayed:false}}});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByRole("heading",{name:locale==="pl"?"Przekazanie pracy":"Work handoff",exact:true}).waitFor();
  if(mode==="create"){
   await page.getByLabel(locale==="pl"?"Odbiorca i rola":"Recipient and role").selectOption("verifier");
   await page.getByRole("button",{name:locale==="pl"?"Dalej":"Next",exact:true}).click();
   const next=page.getByRole("button",{name:locale==="pl"?"Dalej":"Next",exact:true});assert.ok(await next.isDisabled());
   for(const label of fieldLabels[locale])await page.getByLabel(label,{exact:false}).fill("Synthetic complete fixture detail");
   await page.screenshot({path:path.join(output,`${locale}-${width}-completeness.png`),fullPage:true});
   await next.click();const create=page.getByRole("button",{name:locale==="pl"?"Zapisz przekazanie":"Record handoff",exact:true});
   await page.screenshot({path:path.join(output,`${locale}-${width}-preview.png`),fullPage:true});
   await create.click();await page.getByText(locale==="pl"?"Nie zapisano. Sprawdź aktualny kontekst i spróbuj ponownie.":"Not saved. Check the current context and try again.").waitFor();
   await create.click();await page.getByText(locale==="pl"?"Zapisano w historii przekazania.":"Recorded in handoff history.").waitFor();
   assert.equal(posts.length,2);assert.equal(posts[0].requestId,posts[1].requestId);assert.equal(posts[0].sourceVersion,hash);assert.equal(posts[0].recipient.id,other);assert.equal(Object.keys(posts[0].content).length,7);checks+=6;
  }else if(mode==="accept"){
   await page.getByRole("button",{name:locale==="pl"?"Przyjmij tę wersję":"Accept this version",exact:true}).click();
   await page.getByText(locale==="pl"?"Zapisano w historii przekazania.":"Recorded in handoff history.").waitFor();assert.equal(posts[0].decision,"accept");assert.equal(posts[0].handoffVersion,1);checks+=2;
  }else if(mode==="reject"){
   const label=locale==="pl"?"Odrzuć tę wersję":"Reject this version";await page.getByRole("button",{name:label,exact:true}).click();
   assert.ok(await page.getByRole("button",{name:label,exact:true}).isDisabled());
   await page.getByLabel(locale==="pl"?"Uzasadnienie odrzucenia":"Rejection reason",{exact:false}).fill("Missing independently reproducible evidence");
   await page.getByLabel(locale==="pl"?"Testy i dowody":"Tests and evidence",{exact:true}).check();
   await page.getByRole("button",{name:label,exact:true}).click();await page.getByText(locale==="pl"?"Zapisano w historii przekazania.":"Recorded in handoff history.").waitFor();assert.equal(posts[0].decision,"reject");assert.deepEqual(posts[0].sections,["tests"]);checks+=3;
  }else{assert.equal(await page.getByRole("button",{name:locale==="pl"?"Przyjmij tę wersję":"Accept this version"}).count(),0);assert.equal(posts.length,0);checks+=2;}
  assert.deepEqual(errors,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));checks+=2;
  await page.screenshot({path:path.join(output,`${locale}-${width}-${mode}.png`),fullPage:true});await page.close();
 }
 console.log(`PASS ${checks} handoff UI assertions; artifacts ${output}`);
}finally{await browser.close();server.close();}
