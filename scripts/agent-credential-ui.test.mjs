import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { chromium } from "playwright";

const output=path.join(os.tmpdir(),"roost-agent-credential-ui");await mkdir(output,{recursive:true});
const bundle=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{AgentCredentialPanel}from'./web/src/features/settings/agent-credential-panel';import{WorkspaceAccessSection}from'./web/src/features/settings/workspace-access-section';createRoot(document.getElementById('root')).render(<LanguageProvider><div className="roost-settings-panel">{location.search.includes("viewer")?<WorkspaceAccessSection workspaceId="00000000-0000-4000-8000-000000000001" currentRole="viewer"/>:<AgentCredentialPanel/>}</div></LanguageProvider>);`,resolveDir:process.cwd(),loader:"tsx"},bundle:true,write:false,jsx:"automatic",define:{"process.env.NODE_ENV":'"test"'}});
const cssName=(await readdir("public/react/assets")).find(n=>/^index-.*\.css$/.test(n)),css=await readFile(path.join("public/react/assets",cssName));
const server=createServer(async(req,res)=>{if(req.url.startsWith("/vendor/phosphor/bold/")){const name=path.basename(req.url);try{const data=await readFile(path.join("node_modules/@phosphor-icons/web/src/bold",name));res.setHeader("Content-Type",name.endsWith("css")?"text/css":"font/woff2");return res.end(data);}catch{res.writeHead(404);return res.end();}}if(req.url==="/app.js"){res.setHeader("Content-Type","text/javascript");return res.end(bundle.outputFiles[0].contents);}if(req.url==="/style.css"){res.setHeader("Content-Type","text/css");return res.end(css);}res.setHeader("Content-Type","text/html");res.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/vendor/phosphor/bold/style.css"><body><div id="root"></div><script src="/app.js"></script></body></html>');});
server.listen(0,"127.0.0.1");await once(server,"listening");const browser=await chromium.launch({headless:true});let checked=0;

const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const copy={en:{create:"Bind agent credential",agent:"Agent",name:"Credential name",save:"Create credential",rotate:"Rotate credential",revoke:"Revoke credential",confirm:"Confirm revocation",close:"Close",once:"Copy this credential now. It will not be shown again.",title:"Agent identities"},pl:{create:"Powiąż poświadczenie agenta",agent:"Agent",name:"Nazwa poświadczenia",save:"Utwórz poświadczenie",rotate:"Rotuj poświadczenie",revoke:"Unieważnij poświadczenie",confirm:"Potwierdź unieważnienie",close:"Zamknij",once:"Skopiuj poświadczenie teraz. Nie będzie można wyświetlić go ponownie.",title:"Tożsamości agentów"}};
async function pageFor(locale,mode,width=1440){
 const page=await browser.newPage({viewport:{width,height:960},reducedMotion:"reduce"});page.on("pageerror",e=>console.error(e.message));await page.addInitScript(v=>localStorage.setItem("companycoreLocale",v),locale);
 const key={id:id(1),agentId:id(2),agentName:"Independent verifier",agentStatus:mode==="inactive"?"inactive":"active",name:"Review credential",keyPrefix:"cc_v1_fixture",active:mode!=="revoked",revokedAt:mode==="revoked"?new Date().toISOString():null,expiresAt:new Date(Date.now()+(mode==="expired"?-1:1)*86400000).toISOString(),version:1,lastUsedAt:new Date().toISOString()};
 const packet={credentials:mode==="empty"?[]:[key],agents:[{id:id(2),name:"Independent verifier",status:key.agentStatus},{id:id(3),name:"Accountable manager",status:"active"}],truncated:mode==="limit"};
 const posts=[];
 await page.route("**/v1/**",async route=>{
  if(mode==="loading")return;
  if(mode==="error")return route.fulfill({status:503,json:{error:{code:"fixture"}}});
  if(route.request().method()==="POST"){
   const body=route.request().postDataJSON();posts.push({url:route.request().url(),body});
   if(mode==="retry"&&posts.length===1)return route.fulfill({status:503,json:{error:{code:"fixture"}}});
   const revoke=route.request().url().endsWith("/revoke");
   if(revoke){key.active=false;key.revokedAt=new Date().toISOString();}
   return route.fulfill({json:{data:{...key,key:revoke?null:mode==="replay"?null:"synthetic-once-value",replayed:mode==="replay"}}});
  }
  return route.fulfill({json:{data:route.request().url().includes("agent-credentials")?packet:[]}});
 });
 await page.goto(`http://127.0.0.1:${server.address().port}/${mode==="viewer"?"?viewer":""}`);return {page,posts};
}
try{
for(const locale of ["pl","en"])for(const width of [390,834,1440])for(const mode of ["active","revoked","inactive","expired","empty","error","loading","limit"]){
 const {page}=await pageFor(locale,mode,width);await page.getByRole("heading",{name:copy[locale].title,exact:true}).waitFor({timeout:5000}).catch(async e=>{console.error(await page.locator("body").innerText());throw e;});await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 if(mode==="revoked")assert.equal(await page.getByRole("button",{name:copy[locale].rotate,exact:true}).count(),0);if(mode==="inactive")assert.equal(await page.getByRole("button",{name:copy[locale].rotate,exact:true}).isEnabled(),false);
 await page.screenshot({path:path.join(output,`${locale}-${mode}-${width}.png`),fullPage:true});await page.close();checked++;
}
for(const locale of ["pl","en"]){
 const c=copy[locale];
 for(const mode of ["create","retry","replay"]){
  const {page,posts}=await pageFor(locale,mode,390);await page.getByRole("button",{name:c.create,exact:true}).click();
  await page.getByRole("combobox",{name:c.agent}).selectOption(id(3));await page.getByLabel(c.name,{exact:false}).fill("Manager review credential");
  await page.screenshot({path:path.join(output,`${locale}-create-editor.png`),fullPage:true});
  await page.getByRole("button",{name:c.save,exact:true}).click();
  if(mode==="retry"){await page.getByRole("alert").waitFor();await page.getByRole("button",{name:c.save,exact:true}).click();}
  if(mode==="replay"){await page.getByRole("dialog").waitFor({state:"hidden"});assert.equal(await page.locator('input[value="synthetic-once-value"]').count(),0);}
  else{await page.getByRole("heading",{name:c.once,exact:true}).waitFor();assert.equal(await page.getByRole("textbox",{name:c.once,exact:true}).inputValue(),"synthetic-once-value");await page.getByRole("dialog").getByRole("button",{name:c.close,exact:true}).last().click();assert.equal(await page.locator('input[value="synthetic-once-value"]').count(),0);}
  if(mode==="retry")assert.deepEqual(posts[0],posts[1]);
  assert.equal(posts[0].body.agentId,id(3));assert.ok(posts[0].body.requestId);await page.close();checked++;
 }
 for(const action of ["rotate","revoke"]){
  const {page,posts}=await pageFor(locale,"active",834);await page.getByRole("button",{name:c[action],exact:true}).click();
  await page.screenshot({path:path.join(output,`${locale}-${action}-editor.png`),fullPage:true});
  await page.getByRole("dialog").getByRole("button",{name:action==="rotate"?c.rotate:c.confirm,exact:true}).click();
  if(action==="rotate")await page.getByRole("heading",{name:c.once,exact:true}).waitFor();else await page.getByRole("dialog").waitFor({state:"hidden"});
  assert.equal(posts[0].body.expectedVersion,1);assert.ok(posts[0].url.endsWith("/"+action));await page.close();checked++;
 }
 const {page}=await pageFor(locale,"viewer");await page.waitForTimeout(150);assert.equal(await page.getByRole("heading",{name:c.title,exact:true}).count(),0);await page.close();checked++;
 const keyboard=await pageFor(locale,"active",390);await keyboard.page.getByRole("button",{name:c.create,exact:true}).click();await keyboard.page.getByRole("dialog").waitFor();await keyboard.page.keyboard.press("Escape");await keyboard.page.getByRole("dialog").waitFor({state:"hidden"});assert.equal(await keyboard.page.getByRole("button",{name:c.create,exact:true}).evaluate(e=>e===document.activeElement),true);await keyboard.page.close();checked++;
}
console.log(JSON.stringify({checked,output}));
}finally{await browser.close();server.close();}
