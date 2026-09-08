import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { build } from "esbuild";
import { chromium } from "playwright";

const output = path.join(os.tmpdir(), "roost-task-risk-ui"); await mkdir(output, { recursive: true });
const bundle = await build({ stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{TaskRiskModal}from'./web/src/features/departments/task-risk';createRoot(document.getElementById('root')).render(<LanguageProvider><TaskRiskModal taskId="00000000-0000-4000-8000-000000000001" onClose={()=>{}}/></LanguageProvider>);`,resolveDir:process.cwd(),loader:"tsx"},bundle:true,write:false,jsx:"automatic",define:{"process.env.NODE_ENV":'"test"'} });
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
const dimensions=["money","data","security","availability","legal","reversibility","users"];
try {
 for(const locale of ["pl","en"])for(const width of [390,768,1440])for(const mode of ["save","readonly","blocked","stale"]) {
  const page=await browser.newPage({viewport:{width,height:960}}),errors=[],posts=[];page.setDefaultTimeout(10000);page.on("pageerror",e=>errors.push(e.message));
  await page.addInitScript(value=>localStorage.setItem("companycoreLocale",value),locale);
  const ref={id:id(3),revision:"2026-09-08T00:00:00.000Z"};
  const entry={taskId:id(1),dimensions:Object.fromEntries(dimensions.map(d=>[d,{level:"low",rationale:"Synthetic bounded impact",evidence:[ref]}])),uncertainty:{level:"bounded",reasons:"Synthetic bounded uncertainty",evidence:[ref]},contradictions:[]};
  const assessment={id:id(4),version:1,createdAt:"2026-09-08T00:00:00Z",assessorId:id(5),jointRationale:"Synthetic joint effect and decomposition justification",entries:[entry],result:{level:"medium",dimensions:Object.fromEntries(dimensions.map(d=>[d,"medium"])),status:"assessed",cumulativeEscalation:0,uncertaintyEscalation:1,reasons:["bounded_uncertainty_escalation"]}};
  let data={task:{id:id(1),title:"Synthetic parser correction with a long but readable scope description"},algorithm:"roost-native-risk-v1",expectedVersion:"a".repeat(64),currentId:mode==="readonly"?id(4):null,canAssess:mode!=="readonly",blockers:mode==="blocked"?["scope_missing","assessment_missing_or_stale"]:[],members:[{id:id(1),title:"Synthetic parser correction",applicationId:id(2),scopeId:mode==="blocked"?null:id(6),scope:{applicationId:id(2),contract:{}},objective:"Restore deterministic parser behavior",relatedBy:["lineage"]}],history:["readonly","stale"].includes(mode)?[assessment]:[],evidence:[{...ref,label:"Synthetic bounded impact evidence",applicationId:null}],evidenceTruncated:false};
  if(mode==="stale")data.evidence[0]={...data.evidence[0],revision:"2026-09-08T01:00:00.000Z"};
  await page.route("**/v1/**",async route=>{
   if(route.request().method()==="POST") {
    const input=route.request().postDataJSON();posts.push(input);assert.equal(input.entries.length,1);assert.equal(input.level,undefined);assert.equal(input.actor,undefined);assert.ok(input.requestId);assert.deepEqual(Object.keys(input.entries[0].dimensions),dimensions);
    if(mode==="stale"&&posts.length===1){data={...data,expectedVersion:"b".repeat(64)};return route.fulfill({status:409,json:{error:"task_risk_stale",errorDetails:{code:"task_risk_stale",message:"Synthetic conflict"}}});}
    data={...data,currentId:id(4),history:[{...assessment,entries:input.entries,jointRationale:input.jointRationale}]};
   }
   return route.fulfill({json:{data}});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);const dialog=page.getByRole("dialog");
  await dialog.getByRole("heading",{name:locale==="pl"?"Ocena ryzyka zadania":"Task risk assessment",exact:true}).waitFor();
  if(["save","stale"].includes(mode)) {
   if(mode==="stale"){const refresh=dialog.getByRole("button",{name:locale==="pl"?"Użyj aktualnej wersji dowodu":"Use current evidence revision",exact:true});assert.equal(await refresh.count(),8);while(await refresh.count())await refresh.first().click();}
   await dialog.locator("fieldset select").first().waitFor();
   for(const select of await dialog.locator("fieldset select").all()) {
    const value=await select.locator('option[value="low"]').count()?"low":await select.locator('option[value="bounded"]').count()?"bounded":ref.id;
    await select.selectOption(value);
   }
   for(const area of await dialog.locator("fieldset textarea[required]").all())await area.fill("Synthetic bounded impact supported by the selected evidence");
   const submit=dialog.getByRole("button",{name:locale==="pl"?"Zapisz wspólną ocenę":"Record joint assessment",exact:true});await submit.focus();
   if(width===390&&mode==="save"){
    await dialog.getByRole("button",{name:locale==="pl"?"Zamknij":"Close",exact:true}).last().click();
    await page.getByRole("button",{name:locale==="pl"?"Kontynuuj edycję":"Keep editing",exact:true}).last().click();
   }
   await submit.click();
   if(mode==="stale"){
    await dialog.getByText(locale==="pl"?/Nie udało się zapisać oceny/:/The assessment could not be saved/).waitFor();
    await dialog.getByRole("button",{name:locale==="pl"?"Odśwież kontekst":"Refresh context",exact:true}).click();
    await submit.click();
   }
   await dialog.getByText(locale==="pl"?"Ocena zapisana. Wróć do zadania i przekaż sprawdzony kontrakt do wykonania.":"Assessment recorded. Return to the task and submit the reviewed contract.",{exact:true}).waitFor();
   assert.equal(posts.length,mode==="stale"?2:1);if(mode==="stale")assert.notEqual(posts[0].requestId,posts[1].requestId);
  } else assert.equal(await dialog.getByRole("button",{name:locale==="pl"?"Zapisz wspólną ocenę":"Record joint assessment",exact:true}).count(),0);
  await dialog.locator('[class*="overflow-y-auto"]').evaluateAll(nodes=>nodes.forEach(n=>n.scrollTop=0));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  await page.screenshot({path:path.join(output,`${locale}-${mode}-${width}.png`)});await page.close();checked++;
 }
 for(const locale of ["pl","en"]) {
  const page=await browser.newPage({viewport:{width:390,height:844}});await page.addInitScript(value=>localStorage.setItem("companycoreLocale",value),locale);
  await page.route("**/v1/**",route=>route.fulfill({status:503,json:{error:{code:"unavailable"}}}));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.getByText(locale==="pl"?/Nie udało się zapisać oceny/:/The assessment could not be saved/).waitFor();
  assert.equal(await page.getByRole("button",{name:locale==="pl"?"Zapisz wspólną ocenę":"Record joint assessment",exact:true}).count(),0);await page.close();checked++;
 }
 console.log(JSON.stringify({checked,output}));
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
