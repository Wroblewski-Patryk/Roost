import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { build } from "esbuild";
import { chromium } from "playwright";

const output = path.join(os.tmpdir(), "roost-capability-suspension-ui"); await mkdir(output, { recursive: true });
const bundle = await build({ stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{CapabilitySuspensionModal}from'./web/src/features/departments/capability-suspension';createRoot(document.getElementById('root')).render(<LanguageProvider><CapabilitySuspensionModal incidentId="00000000-0000-4000-8000-000000000001" onClose={()=>{}}/></LanguageProvider>);`,resolveDir:process.cwd(),loader:"tsx"},bundle:true,write:false,jsx:"automatic",define:{"process.env.NODE_ENV":'"test"'} });
const css = (await readdir("public/react/assets")).find(name => /^index-.*\.css$/.test(name));
const server = createServer(async (req, res) => {
  if (req.url === "/app.js") { res.setHeader("Content-Type", "text/javascript"); return res.end(bundle.outputFiles[0].text); }
  if (req.url === "/style.css") { res.setHeader("Content-Type", "text/css"); return res.end(await readFile(path.join("public/react/assets", css))); }
  if (req.url.startsWith("/vendor/phosphor/bold/")) {
    const name = path.basename(req.url);
    try { res.setHeader("Content-Type", name.endsWith("css") ? "text/css" : "font/woff2"); return res.end(await readFile(path.join("node_modules/@phosphor-icons/web/src/bold", name))); } catch { res.writeHead(404); return res.end(); }
  }
  res.setHeader("Content-Type", "text/html"); res.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/vendor/phosphor/bold/style.css"><body class="bg-base-200"><main id="root" style="padding:24px;max-width:1600px;margin:auto"></main><script src="/app.js"></script></body></html>');
});
server.listen(0, "127.0.0.1"); await once(server, "listening");
const browser=await chromium.launch({headless:true});let checked=0;
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
try{
 for(const locale of ["pl","en"])for(const width of [390,768,1440])for(const mode of ["create","restore"]){
  const page=await browser.newPage({viewport:{width,height:960}}),errors=[],posts=[];page.setDefaultTimeout(8000);page.on("pageerror",e=>errors.push(e.message));
  await page.addInitScript(value=>localStorage.setItem("companycoreLocale",value),locale);
  let suspension={id:id(2),incidentId:id(1),taskId:id(3),applicationId:id(4),operation:"review_decision",agentId:id(5),credentialId:id(6),issuerUserId:id(7),active:true,version:3,reason:"Synthetic serious review incident",scopeProof:"Only this credential and task are affected",createdAt:"2026-09-08T08:00:00Z"};
  let history=[{id:id(9),version:3,action:"verify",actorUserId:id(8),evidenceId:id(10),payload:{assessment:"Independently repeated the bounded regression"},createdAt:"2026-09-08T08:02:00Z"},{id:id(10),version:2,action:"evidence",actorUserId:id(7),payload:{cause:"Incorrect comparison",impact:"One review scope",remediation:"Fixed comparison",regressionProof:"Synthetic regression passed",limitations:"Native review only",repairAuthorUserId:id(7)},createdAt:"2026-09-08T08:01:00Z"}];
  const detail=()=>({suspension,history,currentUserId:id(7),canEdit:true,canDecide:true,members:[{userId:id(7),label:"Fixture owner"},{userId:id(8),label:"Independent fixture verifier"}]});
  await page.route("**/v1/**",async route=>{const request=route.request(),url=new URL(request.url());
   if(request.method()==="POST"){
    const input=request.postDataJSON();posts.push(input);assert.ok(input.requestId);
    if(mode==="create"){assert.equal(input.incidentId,id(1));assert.equal(input.agentId,id(5));assert.equal(input.applicationId,id(4));assert.equal(input.broaderReason,undefined);suspension={...suspension,version:1};history=[];}
    else{assert.equal(input.action,"restore");assert.equal(input.evidenceId,id(10));assert.equal(input.expectedVersion,3);suspension={...suspension,active:false,version:4};history=[{id:id(11),version:4,action:"restore",actorUserId:id(7),payload:{reason:input.reason},createdAt:"2026-09-08T08:03:00Z"},...history];}
    return route.fulfill({json:{data:detail()}});
   }
   if(url.pathname.endsWith("/catalog"))return route.fulfill({json:{data:{tasks:[{id:id(3),title:"Synthetic parser task",applicationId:id(4),applicationLabel:"Fixture application"}],agents:[{id:id(5),name:"Fixture review agent"}],credentialChoices:[{id:id(6),boundAgentId:id(5),keyPrefix:"fixture-prefix"}],hosts:[],incidents:[{id:id(1),title:"Synthetic serious incident"}],canBroaden:true}}});
   if(url.pathname.endsWith(id(2)))return route.fulfill({json:{data:detail()}});
   return route.fulfill({json:{data:{suspensions:mode==="create"?[]:[suspension],canCreate:true}}});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const dialog=page.getByRole("dialog"),create=locale==="pl"?"Oznacz poważny incydent i zawieś":"Classify serious incident and suspend";
  if(mode==="create"){
   await dialog.getByRole("button",{name:create,exact:true}).click();
   await dialog.getByLabel(locale==="pl"?"Zadanie i aplikacja":"Task and application",{exact:false}).selectOption(`${id(3)}:${id(4)}`);
   await dialog.getByLabel(locale==="pl"?"Agent (opcjonalnie)":"Agent (optional)",{exact:false}).selectOption(id(5));
   await dialog.getByLabel(locale==="pl"?"Powód":"Reason",{exact:false}).fill("Synthetic serious incident with a narrow affected scope");
   await dialog.getByLabel(locale==="pl"?"Dowód zakresu wpływu":"Evidence of affected scope",{exact:false}).fill("Synthetic audit proves the affected reviewer on this task");
  }else{
   await dialog.getByRole("button",{name:new RegExp(locale==="pl"?"Zakres wpływu":"Affected scope")}).click();
   await dialog.getByLabel(locale==="pl"?"Zapisz decyzję":"Record decision",{exact:false}).selectOption("restore");
   await dialog.getByLabel(locale==="pl"?"Powód":"Reason",{exact:false}).fill("Owner accepts the independently verified regression proof");
   await dialog.getByText(/Version 2|Wersja 2/).first().click();
  }
  const submit=dialog.getByRole("button",{name:mode==="create"?create:locale==="pl"?"Zapisz decyzję":"Record decision",exact:true}).last();
  assert.equal(await submit.isDisabled(),true);
  await dialog.getByRole("checkbox").check();await submit.focus();assert.equal(await submit.isEnabled(),true);
  await page.screenshot({path:path.join(output,`${locale}-${mode}-${width}.png`)});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await submit.click();await dialog.getByText(locale==="pl"?"Zapisano":"Recorded",{exact:true}).waitFor();assert.equal(posts.length,1);
  if(mode==="restore")await dialog.getByText(locale==="pl"?"Uprawnienie przywrócone":"Capability restored",{exact:true}).waitFor();
  assert.deepEqual(errors,[]);await page.close();checked++;
 }
 for(const locale of ["pl","en"])for(const mode of ["readonly","stale","error"]){
  const page=await browser.newPage({viewport:{width:390,height:960}});page.setDefaultTimeout(8000);
  await page.addInitScript(value=>localStorage.setItem("companycoreLocale",value),locale);
  await page.route("**/v1/**",route=>{
   assert.equal(route.request().method(),"GET");
   if(mode==="error")return route.fulfill({status:503,json:{error:{code:"unavailable"}}});
   const suspension={id:id(2),incidentId:id(1),taskId:id(3),applicationId:id(4),operation:"review_decision",active:true,version:4,createdAt:"2026-09-08T08:00:00Z"};
   if(new URL(route.request().url()).pathname.endsWith(id(2)))return route.fulfill({json:{data:{suspension,currentUserId:id(7),canEdit:mode!=="readonly",canDecide:mode!=="readonly",members:[],history:[{id:id(11),version:4,action:"reopen",payload:{reason:"Changed evidence"},createdAt:"2026-09-08T08:00:00Z"},{id:id(9),version:3,action:"verify",actorUserId:id(8),evidenceId:id(10),payload:{assessment:"Previous proof"},createdAt:"2026-09-08T08:00:00Z"},{id:id(10),version:2,action:"evidence",actorUserId:id(7),payload:{repairAuthorUserId:id(7)},createdAt:"2026-09-08T08:00:00Z"}]}}});
   return route.fulfill({json:{data:{suspensions:[suspension],canCreate:false}}});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);const dialog=page.getByRole("dialog");
  if(mode==="error")await dialog.getByText(locale==="pl"?/Nie udało się zapisać/:/Could not record or load/).waitFor();
  else{await dialog.getByRole("button",{name:new RegExp(locale==="pl"?"Zakres wpływu":"Affected scope")}).click();await dialog.getByText(locale==="pl"?"Uprawnienie zablokowane":"Capability blocked",{exact:true}).waitFor();
   assert.equal(await dialog.locator('option[value="restore"]').count(),0);assert.equal(await dialog.locator('option[value="verify"]').count(),0);
   if(mode==="readonly")assert.equal(await dialog.getByRole("checkbox").count(),0);
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.close();checked++;
 }
 console.log(JSON.stringify({checked,output}));
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
