import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { chromium } from "playwright";

const output=path.join(os.tmpdir(),"roost-task-capability-ui");await mkdir(output,{recursive:true});
const bundle=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{TaskCapabilityModal}from'./web/src/features/departments/task-capability';createRoot(document.getElementById('root')).render(<LanguageProvider><TaskCapabilityModal taskId="00000000-0000-4000-8000-000000000001" onClose={()=>window.closedGrant=true}/></LanguageProvider>);`,resolveDir:process.cwd(),loader:"tsx"},bundle:true,write:false,jsx:"automatic",define:{"process.env.NODE_ENV":'"test"'}});
const cssName=(await readdir("public/react/assets")).find(n=>/^index-.*\.css$/.test(n)),css=await readFile(path.join("public/react/assets",cssName));
const server=createServer(async(req,res)=>{if(req.url.startsWith("/vendor/phosphor/bold/")){const name=path.basename(req.url);try{const data=await readFile(path.join("node_modules/@phosphor-icons/web/src/bold",name));res.setHeader("Content-Type",name.endsWith("css")?"text/css":"font/woff2");return res.end(data);}catch{res.writeHead(404);return res.end();}}if(req.url==="/app.js"){res.setHeader("Content-Type","text/javascript");return res.end(bundle.outputFiles[0].contents);}if(req.url==="/style.css"){res.setHeader("Content-Type","text/css");return res.end(css);}res.setHeader("Content-Type","text/html");res.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/vendor/phosphor/bold/style.css"><body><div id="root"></div><script src="/app.js"></script></body></html>');});
server.listen(0,"127.0.0.1");await once(server,"listening");const browser=await chromium.launch({headless:true});let checked=0;

const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const {issueCapabilitySchema,revokeCapabilitySchema}=createRequire(import.meta.url)("../dist/modules/agent-runtime/task-capability-contract.js");
const copies={en:{title:"Task grants",operation:"Agent and operation",reason:"Authorization reason",issue:"Issue grant",revoke:"Revoke grant",revokeReason:"Revocation reason",confirm:"Confirm revocation",saved:"Grant history updated.",discard:"Discard unsaved changes?",stay:"Keep editing",close:"Back to review"},pl:{title:"Granty zadania",operation:"Agent i operacja",reason:"Uzasadnienie uprawnienia",issue:"Wydaj grant",revoke:"Cofnij grant",revokeReason:"Powód cofnięcia",confirm:"Potwierdź cofnięcie",saved:"Historia grantów została zaktualizowana.",discard:"Odrzucić niezapisane zmiany?",stay:"Kontynuuj edycję",close:"Wróć do oceny"}};
async function pageFor(locale,mode,width=1440){
 const page=await browser.newPage({viewport:{width,height:960},reducedMotion:"reduce"});const errors=[];page.on("pageerror",e=>errors.push(e.message));await page.addInitScript(v=>localStorage.setItem("companycoreLocale",v),locale);
 const g={id:id(10),operation:"review_decision",status:mode==="long"?"active":mode,reason:"Verify parser evidence",validFrom:new Date().toISOString(),validUntil:new Date(Date.now()+1800000).toISOString(),snapshot:{agentLabel:mode==="long"?"LongAgentLabel".repeat(24):"Independent verifier",credentialPrefix:"cc_v1_demo",applicationLabel:"Fixture application",issuerLabel:"Workspace administrator"},usage:mode==="consumed"?{createdAt:new Date().toISOString()}:null,revocation:mode==="revoked"?{reason:"End authorization",createdAt:new Date().toISOString()}:null};
 const options=["review_decision","return_to_executor","create_specialist_task"].map(operation=>({operation,agentLabel:"Independent verifier",credentialId:id(3),credentialPrefix:"cc_v1_demo",credentialExpiresAt:new Date(Date.now()+86400000).toISOString()}));
 const packet={task:{id:id(1),title:"Repair parser"},applicationLabel:"Fixture application",expectedVersion:"a".repeat(64),options:mode==="unavailable"?[]:options,grants:mode==="empty"?[]:[g],nextCursor:mode==="older"?id(10):null};const posts=[];
 await page.route("**/v1/**",async route=>{
  if(mode==="loading")return;if(mode==="error")return route.fulfill({status:503,json:{error:{code:"fixture"}}});
  if(route.request().method()==="POST"){
   const body=route.request().postDataJSON(),revoke=route.request().url().endsWith("/revoke");posts.push({body,url:route.request().url()});
   assert.ok((revoke?revokeCapabilitySchema:issueCapabilitySchema).safeParse(body).success,JSON.stringify(body));
   if(mode==="retry"&&posts.length===1)return route.fulfill({status:503,json:{error:{code:"fixture"}}});
   if(revoke){g.revocation={reason:body.reason,createdAt:new Date().toISOString()};g.status="revoked";}else packet.grants=[{...g,id:id(11),status:"active",reason:body.reason,operation:body.operation}];
   return route.fulfill({json:{data:{grant:g}}});
  }
  if(route.request().url().includes("cursor=")){packet.nextCursor=null;return route.fulfill({json:{data:{...packet,grants:[{...g,id:id(12)}]}}});}
  return route.fulfill({json:{data:packet}});
 });
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.getByRole("heading",{name:copies[locale].title,exact:true}).waitFor();return {page,posts,errors};
}
try{
 for(const locale of ["pl","en"])for(const width of [390,834,1440])for(const mode of ["active","pending","consumed","revoked","expired","invalidated","empty","unavailable","error","loading","long"]){
  const {page,errors}=await pageFor(locale,mode,width);await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  if(["revoked","expired","invalidated"].includes(mode))assert.equal(await page.getByRole("button",{name:copies[locale].revoke,exact:true}).count(),0);
  if(mode==="unavailable")assert.equal(await page.getByRole("button",{name:copies[locale].issue,exact:true}).count(),0);
  if(mode==="long")await page.locator("article").scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(output,`${locale}-${mode}-${width}.png`),fullPage:true});await page.close();checked++;
 }
 for(const locale of ["pl","en"]){const c=copies[locale];
  for(const operation of ["review_decision","return_to_executor","create_specialist_task"]){
   const {page,posts}=await pageFor(locale,"retry",390);await page.getByRole("combobox",{name:c.operation}).selectOption(operation+":"+id(3));await page.getByRole("textbox",{name:c.reason}).fill("Authorize exact operation");
   await page.screenshot({path:path.join(output,`${locale}-issue-editor.png`),fullPage:true});await page.getByRole("button",{name:c.issue,exact:true}).click();await page.getByRole("alert").waitFor();await page.getByRole("button",{name:c.issue,exact:true}).click();await page.getByText(c.saved,{exact:true}).waitFor();assert.deepEqual(posts[0],posts[1]);assert.equal(posts[0].body.operation,operation);await page.close();checked++;
  }
  const r=await pageFor(locale,"active",834);await r.page.getByRole("button",{name:c.revoke,exact:true}).click();await r.page.getByRole("textbox",{name:c.revokeReason}).fill("End this authorization");await r.page.getByRole("button",{name:c.confirm,exact:true}).click();await r.page.getByText(c.saved,{exact:true}).waitFor();assert.ok(r.posts[0].url.endsWith("/revoke"));await r.page.close();checked++;
  const more=await pageFor(locale,"older",390);await more.page.getByRole("button",{name:locale==="pl"?"Starsze granty":"Older grants",exact:true}).click();await more.page.waitForTimeout(100);assert.equal(await more.page.locator("article").count(),2);await more.page.close();checked++;
  const k=await pageFor(locale,"empty",390);await k.page.getByRole("textbox",{name:c.reason}).fill("Unsaved authorization");await k.page.keyboard.press("Escape");await k.page.getByRole("heading",{name:c.discard,exact:true}).waitFor();await k.page.getByRole("button",{name:c.stay,exact:true}).last().click();assert.equal(await k.page.getByRole("textbox",{name:c.reason}).inputValue(),"Unsaved authorization");await k.page.close();checked++;
 }
 console.log(JSON.stringify({checked,output}));
}finally{await browser.close();server.close();}
