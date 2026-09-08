import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { build } from "esbuild";
import { chromium } from "playwright";

const output = path.join(os.tmpdir(), "roost-risk-admission-ui"); await mkdir(output, { recursive: true });
const bundle = await build({ stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{TaskRiskAdmissionModal}from'./web/src/features/departments/task-risk-admission';createRoot(document.getElementById('root')).render(<LanguageProvider><TaskRiskAdmissionModal taskId="00000000-0000-4000-8000-000000000001" onClose={()=>{}}/></LanguageProvider>);`,resolveDir:process.cwd(),loader:"tsx"},bundle:true,write:false,jsx:"automatic",define:{"process.env.NODE_ENV":'"test"'} });
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
try {
 for(const locale of ["pl","en"])for(const width of [390,768,1440])for(const mode of ["save","readonly","critical","conflict","scope","owner"]) {
  const page=await browser.newPage({viewport:{width,height:960}}),errors=[],posts=[];page.setDefaultTimeout(10000);page.on("pageerror",e=>errors.push(e.message));
  await page.addInitScript(value=>localStorage.setItem("companycoreLocale",value),locale);
  const gateNames=["critical","owner"].includes(mode)?["procedure","extended_review","mandate","backup","restore_plan","owner_approval"]:["procedure"];
  let data={task:{id:id(1),title:"Synthetic parser correction"},expectedVersion:"a".repeat(64),scope:{id:id(2),input:{taskType:"code_change",environment:"development",targetId:id(3),releaseId:id(3),procedureId:id(4),commit:"a".repeat(40),destructive:false,rationale:"Synthetic exact scope"}},permissions:{canWrite:mode!=="readonly",canApprove:true,independent:true},records:[{id:id(3),title:"Synthetic verified evidence",applicationId:id(5),revision:"2026-09-08T00:00:00.000Z"}],procedures:[{id:id(4),name:"Synthetic procedure",version:1}],history:[],operations:Object.fromEntries(["runtime_execute","review_decision","return_to_executor","create_specialist_task"].map(op=>[op,{status:mode==="readonly"?"admitted":"blocked",gates:gateNames.map((gate,i)=>({gate,status:mode==="readonly"||mode==="owner"&&gate!=="owner_approval"?"present":mode==="critical"?["present","stale","failed","required","required","required"][i]:"required",version:1,referenceId:id(3),detail:{rationale:"Synthetic evidence bound to the exact operation"},expiresAt:"2026-09-08T12:15:00Z"}))}]))};
  await page.route("**/v1/**",async route=>{
   if(route.request().method()==="POST"){
    const input=route.request().postDataJSON();posts.push(input);assert.ok(input.requestId);assert.equal(input.requiredGates,undefined);assert.equal(input.actorUserId,undefined);if(mode==="scope"){assert.equal(input.gate,undefined);assert.equal(input.commit,"a".repeat(40));assert.equal(input.destructive,false);}else{assert.equal(input.gate,mode==="owner"?"owner_approval":"procedure");assert.equal(input.operation,"runtime_execute");if(mode==="owner")assert.equal(input.decision,"approve_exact_operation");}
    if(mode==="conflict"&&posts.length===1){data={...data,expectedVersion:"b".repeat(64)};return route.fulfill({status:409,json:{error:"risk_admission_stale"}});}
    data={...data,operations:{...data.operations,runtime_execute:{status:mode==="scope"?"blocked":"admitted",gates:data.operations.runtime_execute.gates.map(g=>g.gate===input.gate?{...g,status:"present",detail:input}:g)}}};
   }
   return route.fulfill({json:{data}});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);const dialog=page.getByRole("dialog");
  await dialog.getByRole("heading",{name:locale==="pl"?"Warunki dopuszczenia":"Admission requirements",exact:true}).waitFor();
  if(mode==="scope"){await dialog.getByRole("button",{name:locale==="pl"?"Zakres operacji":"Operation scope",exact:true}).click();await dialog.locator('button[type="submit"]').click();await page.waitForFunction(()=>!document.querySelector('button[type="submit"]')?.disabled);assert.equal(posts.length,1);}
  if(["save","conflict","owner"].includes(mode)){
   if(mode==="owner")await dialog.locator("fieldset select").first().selectOption("owner_approval");
   await dialog.locator("fieldset select").nth(1).selectOption(id(3));
   await dialog.locator("fieldset select").nth(2).selectOption("passed");
   for(const area of await dialog.locator("fieldset textarea").all())await area.fill("Synthetic reviewed and observed result");
   await dialog.locator('button[type="submit"]').click();
   if(mode==="conflict"){
    await dialog.getByRole("button",{name:locale==="pl"?"Odśwież kontekst":"Refresh context",exact:true}).click();
    await page.waitForFunction(()=>!document.querySelector('[role="status"]'));
    await dialog.locator('button[type="submit"]').click();
    assert.equal(posts.length,2);assert.notEqual(posts[0].requestId,posts[1].requestId);assert.equal(posts[1].expectedVersion,"b".repeat(64));
   }
   await dialog.getByRole("heading",{name:locale==="pl"?"Warunki spełnione":"Requirements satisfied",exact:true}).waitFor();assert.ok(posts.length);
  }
  if(mode==="readonly")assert.equal(await dialog.locator('button[type="submit"]').count(),0);
  if(mode==="critical"){assert.equal(await dialog.locator("section").count(),8);await dialog.getByText(locale==="pl"?"Świeża zgoda ownera":"Fresh owner approval",{exact:true}).first().waitFor();}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
  await page.screenshot({path:path.join(output,`${locale}-${mode}-${width}.png`),fullPage:true});checked++;await page.close();
 }
 console.log(JSON.stringify({checked,status:"passed"}));
} finally {await browser.close();server.close();}
