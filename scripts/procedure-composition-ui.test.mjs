import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { build } from "esbuild";
import { chromium } from "playwright";

const output = path.join(os.tmpdir(), "roost-procedure-composition-ui"); await mkdir(output, { recursive: true });
const bundle = await build({ stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{TaskProcedureCompositionModal,ProcedureContractsModal}from'./web/src/features/departments/procedure-composition';createRoot(document.getElementById('root')).render(<LanguageProvider>{location.pathname==="/contracts"?<ProcedureContractsModal procedureId="00000000-0000-4000-8000-000000000003" onClose={()=>{}}/>:<TaskProcedureCompositionModal taskId="00000000-0000-4000-8000-000000000001" onClose={()=>{}}/>}</LanguageProvider>);`,resolveDir:process.cwd(),loader:"tsx"},bundle:true,write:false,jsx:"automatic",define:{"process.env.NODE_ENV":'"test"'} });
const css = (await readdir("public/react/assets")).find(name => /^index-.*\.css$/.test(name));
const stylesheet=await readFile(path.join("public/react/assets",css));
const server = createServer(async (req, res) => {
  if (req.url === "/app.js") { res.setHeader("Content-Type", "text/javascript"); return res.end(bundle.outputFiles[0].text); }
  if (req.url === "/style.css") { res.setHeader("Content-Type", "text/css"); return res.end(stylesheet); }
  if (req.url.startsWith("/vendor/phosphor/bold/")) {
    const name = path.basename(req.url);
    try { res.setHeader("Content-Type", name.endsWith("css") ? "text/css" : "font/woff2"); return res.end(await readFile(path.join("node_modules/@phosphor-icons/web/src/bold", name))); } catch { res.writeHead(404); return res.end(); }
  }
  res.setHeader("Content-Type", "text/html"); res.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/vendor/phosphor/bold/style.css"><body class="bg-base-200"><main id="root" style="padding:24px;max-width:1600px;margin:auto"></main><script src="/app.js"></script></body></html>');
});
server.listen(0, "127.0.0.1"); await once(server, "listening");
const browser=await chromium.launch({headless:true});let checked=0;
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const roles=["requester","accountableManager","executor","verifier","releaser"];
const contract={kind:"base",taskType:"code_change",operation:"runtime_execute",applicationId:null,componentId:null,baseProcedureId:null,inputs:["Exact source"],outputs:["Verified result"],evidence:["Observed test"],completion:["All checks passed"],roles,tools:["repository_read"],steps:[{key:"verify",instruction:"Verify the synthetic component",role:"executor",tools:["repository_read"],inputs:[],outputs:["Checked result"],evidence:["Test result"],requires:[]}]};
try {
 for(const locale of ["pl","en"])for(const width of [390,768,1440])for(const mode of ["selection","conflict","exception","readonly","publish","published-readonly"]){
  const page=await browser.newPage({viewport:{width,height:960}}),errors=[],posts=[];page.setDefaultTimeout(12000);page.on("pageerror",e=>errors.push(e.message));
  await page.addInitScript(value=>localStorage.setItem("companycoreLocale",value),locale);
  const published=mode.startsWith("publish"),readonly=mode.includes("readonly");
  const composition={algorithm:"roost-procedure-composition-v1",status:mode==="exception"?"blocked":"composed",seal:"c".repeat(64),missing:mode==="exception"?["extension"]:[],conflicts:[],gates:["procedure","extended_review","mandate","backup","restore_plan","owner_approval"],refs:{base:id(3),extension:id(4)},versions:{base:2,extension:1},fields:{inputs:[{value:"Exact source",source:"base",versionId:id(3)}],outputs:[],evidence:[],completion:[],roles:[],tools:["repository_read"]},steps:contract.steps.map(s=>({...s,source:"base",versionId:id(3)})),exceptions:[],expiresAt:null};
  let data=published?{procedure:{id:id(3),name:"Synthetic shared procedure"},expectedVersion:"a".repeat(64),versions:[{id:id(5),version:1,body:contract,rationale:"Synthetic published version",issuerId:id(8),createdAt:"2026-09-08T00:00:00Z",valid:true}],applications:[],procedures:[],permissions:{canPublish:!readonly,canWithdraw:!readonly}}:{task:{id:id(1),title:"Synthetic exact component change"},expectedVersion:"a".repeat(64),operations:Object.fromEntries(["runtime_execute","review_decision","return_to_executor","create_specialist_task"].map(op=>[op,{...composition,operation:op}])),selections:[{operation:"runtime_execute",baseProcedureId:id(3),extensionProcedureId:mode==="exception"?null:id(4),rationale:"Synthetic narrow scope"}],pinned:composition,procedures:[{id:id(3),name:"Shared verification",version:1},{id:id(4),name:"Component extension",version:1}],permissions:{canWrite:!readonly,canApprove:mode==="exception"}};
  await page.route("**/v1/**",async route=>{
   if(route.request().method()==="POST"){
    const input=route.request().postDataJSON();posts.push(input);assert.ok(input.requestId);assert.equal(input.actorUserId,undefined);assert.equal(input.seal,undefined);
    if(mode==="conflict"&&posts.length===1){data={...data,expectedVersion:"b".repeat(64)};return route.fulfill({status:409,json:{error:"procedure_composition_stale"}});}
    if(mode==="exception"){assert.equal(input.missing,"extension");assert.equal(input.decision,"approve_exact_missing_element");assert.equal(input.expiresAt,undefined);data.operations.runtime_execute={...composition,status:"composed",missing:[],exceptions:[{id:id(9),missing:"extension",version:1,issuerId:id(8),expiresAt:new Date(Date.now()+900000).toISOString(),rationale:input.rationale}]};}
    if(published){assert.deepEqual(input.contract,contract);assert.equal(route.request().url().endsWith("/publish"),true);}
   }
   return route.fulfill({json:{data}});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/${published?"contracts":""}`);
  const dialog=page.getByRole("dialog");await dialog.getByRole("heading",{name:locale==="pl"?(published?"Kontrakty wykonania":"Skład procedury"):(published?"Execution contracts":"Procedure composition"),exact:true}).waitFor();
  await dialog.getByRole("button",{name:locale==="pl"?"Odśwież":"Refresh",exact:true}).waitFor();
  if(published&&!readonly){await dialog.locator("summary").first().click();await dialog.getByRole("button",{name:locale==="pl"?"Sprawdź nową wersję":"Preview new version",exact:true}).first().click();await dialog.getByLabel(locale==="pl"?"Uzasadnienie":"Rationale").fill("Synthetic reviewed publication");await dialog.locator('button[type="submit"]').click();await dialog.locator('button[type="submit"]').click();}
  else if(mode==="exception"){await dialog.getByRole("button",{name:locale==="pl"?"Zatwierdź dokładny brak na 15 minut":"Approve this exact omission for 15 minutes",exact:true}).click();}
  else if(!readonly){await dialog.getByLabel(locale==="pl"?"Uzasadnienie":"Rationale").fill("Synthetic changed exact selection");await dialog.locator('button[type="submit"]').click();if(mode==="conflict"){await dialog.getByRole("alert").waitFor();await dialog.getByRole("button",{name:locale==="pl"?"Odśwież":"Refresh",exact:true}).click();await page.waitForFunction(()=>!document.querySelector('button[type="submit"]')?.disabled);assert.equal(await dialog.getByLabel(locale==="pl"?"Uzasadnienie":"Rationale").inputValue(),"Synthetic changed exact selection");await dialog.locator('button[type="submit"]').click();}}
  if(!readonly){await dialog.getByText(locale==="pl"?"Zapisano. Sprawdź dowody ryzyka i jawnie przekaż zadanie do wykonania.":"Saved. Check risk evidence and explicitly submit the task.",{exact:true}).waitFor();assert.ok(posts.length);}
  if(readonly)assert.equal(await dialog.locator('button[type="submit"]').count(),0);
  if(mode==="conflict"){assert.equal(posts.length,2);assert.notEqual(posts[0].requestId,posts[1].requestId);assert.equal(posts[1].expectedVersion,"b".repeat(64));}
  assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.keyboard.press("Tab");assert.equal(await page.evaluate(()=>document.activeElement!==document.body),true);
  await page.screenshot({path:path.join(output,`${locale}-${mode}-${width}.png`),fullPage:true});checked++;await page.close();
 }
 console.log(JSON.stringify({checked,output}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
