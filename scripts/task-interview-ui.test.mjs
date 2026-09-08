import assert from "node:assert/strict";
import {createServer} from "node:http";
import {once} from "node:events";
import {mkdir,readFile,readdir} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {build} from "esbuild";
import {chromium} from "playwright";
const output=path.join(os.tmpdir(),"roost-interview-ui");await mkdir(output,{recursive:true});
const bundle=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{TaskInterviewModal}from'./web/src/features/departments/task-interview';createRoot(document.getElementById('root')).render(<LanguageProvider><TaskInterviewModal taskId="00000000-0000-4000-8000-000000000001" onClose={()=>{document.body.dataset.closed='true'}}/></LanguageProvider>);`,resolveDir:process.cwd(),loader:"tsx"},bundle:true,write:false,jsx:"automatic",define:{"process.env.NODE_ENV":'"test"'}});
const css=(await readdir("public/react/assets")).find(n=>/^index-.*\.css$/.test(n));
const cssContent=await readFile(path.join("public/react/assets",css));
const server=createServer(async(req,res)=>{
 if(req.url==="/app.js"){res.setHeader("Content-Type","text/javascript");return res.end(bundle.outputFiles[0].text);}
 if(req.url==="/style.css"){res.setHeader("Content-Type","text/css");return res.end(cssContent);}
 res.setHeader("Content-Type","text/html");res.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body><div id="root"></div><script src="/app.js"></script></body></html>');
});server.listen(0,"127.0.0.1");await once(server,"listening");
const browser=await chromium.launch({headless:true}),id="00000000-0000-4000-8000-000000000001",other="00000000-0000-4000-8000-000000000002",hash="a".repeat(64);

let checks=0;
try{
 for(const locale of ["pl","en"])for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.addInitScript(locale=>{localStorage.setItem("companycoreLocale",locale);localStorage.setItem("companycore.lang",locale);localStorage.setItem("cc_language",locale);},locale);
  let state="pending",writes=[];
  const data=()=>({expectedVersion:hash,contextVersion:hash,canPrepare:true,ownerIds:[other],sources:[{id:other,revision:hash,title:"Recorded research"}],blocking:state!=="accepted",cases:[{id,version:1,status:state,current:true,canRespond:true,entries:[],body:{topic:"Delivery scope",missing:"Choose a delivery scope",context:"Two feasible options",recommendation:"Small delivery first",consequences:"Broader scope needs more time",scope:"One task",deferralEffect:"Delivery remains blocked",dependencies:[{taskId:id,blockedPart:"Delivery implementation"}],gathering:{checkedSources:[{id:other,findings:"Two options remain"}]},questions:[{field:"scope",question:"Which scope should be delivered?",options:["Small delivery","Broad delivery"]}]}}]});
  await page.route("**/v1/**",async route=>{if(route.request().method()==="POST"){const b=route.request().postDataJSON();writes.push(b);state=b.action==="answer"?"proposed":b.action==="accept"?"accepted":"deferred";await route.fulfill({json:{data:{}}});}else {const d=data(),second=structuredClone(d.cases[0]);second.id=other;second.body.topic="Secondary delivery scope";if(new URL(route.request().url()).searchParams.get("caseId")===other)d.cases[0].body={topic:d.cases[0].body.topic};else second.body={topic:second.body.topic};d.cases.push(second);await route.fulfill({json:{data:d}});}});
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByLabel("Which scope should be delivered?").fill("Small delivery");
  const polish=await page.getByText("Pytania wymagające decyzji",{exact:true}).count()>0;
  await page.getByLabel(polish?"Uzasadnienie":"Reason",{exact:true}).fill("Explicit scoped decision");await page.getByRole("button",{name:polish?"Odpowiedz":"Respond",exact:true}).click();
  await page.getByRole("button",{name:polish?"Akceptuj propozycję":"Accept proposal",exact:true}).waitFor();assert.equal(writes[0].action,"answer");checks++;
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);checks++;
  await page.screenshot({path:path.join(output,`interview-${locale}-${width}.png`),fullPage:true});
  await page.getByRole("combobox",{name:polish?"Wybierz blok pytań":"Select question block"}).selectOption(other);await page.getByRole("heading",{name:"Secondary delivery scope",exact:true}).waitFor();checks++;
  assert.deepEqual(errors,[]);checks++;await page.close();
 }
 console.log(`Interview UI: ${checks} checks passed`);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
