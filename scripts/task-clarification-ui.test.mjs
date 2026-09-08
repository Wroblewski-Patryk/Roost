import assert from "node:assert/strict";
import {createServer} from "node:http";
import {once} from "node:events";
import {mkdir,readFile,readdir} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {build} from "esbuild";
import {chromium} from "playwright";
const output=path.join(os.tmpdir(),"roost-clarification-ui");await mkdir(output,{recursive:true});
const bundle=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{LanguageProvider}from'./web/src/i18n/i18n';import{TaskClarificationModal}from'./web/src/features/departments/task-clarification';createRoot(document.getElementById('root')).render(<LanguageProvider><TaskClarificationModal taskId="00000000-0000-4000-8000-000000000001" onClose={()=>{document.body.dataset.closed='true'}}/></LanguageProvider>);`,resolveDir:process.cwd(),loader:"tsx"},bundle:true,write:false,jsx:"automatic",define:{"process.env.NODE_ENV":'"test"'}});
const css=(await readdir("public/react/assets")).find(n=>/^index-.*\.css$/.test(n));
const cssContent=await readFile(path.join("public/react/assets",css));
const server=createServer(async(req,res)=>{
 if(req.url==="/app.js"){res.setHeader("Content-Type","text/javascript");return res.end(bundle.outputFiles[0].text);}
 if(req.url==="/style.css"){res.setHeader("Content-Type","text/css");return res.end(cssContent);}
 res.setHeader("Content-Type","text/html");res.end('<!doctype html><html data-theme="roost"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body><div id="root"></div><script src="/app.js"></script></body></html>');
});server.listen(0,"127.0.0.1");await once(server,"listening");
const browser=await chromium.launch({headless:true}),id="00000000-0000-4000-8000-000000000001",other="00000000-0000-4000-8000-000000000002",hash="a".repeat(64);
const author={taskId:id,role:"executor",principal:{kind:"agent",id}},receiver={taskId:id,role:"verifier",principal:{kind:"user",id:other}};
const content={type:"question",text:"Which recorded test covers empty input?",references:[],expectedResponse:{kind:"answer",instruction:"Identify the recorded fixture evidence",dueAt:null},material:{category:"constraint",reason:"The observed input differs from the accepted assumption"}};
const entry={id,threadId:id,version:1,kind:"message",replyTo:null,supersedes:null,author,recipient:receiver,contextVersion:hash,content,verifiedRefs:[],createdAt:"2026-09-08T10:00:00Z"};
const thread={id,taskId:id,relatedTaskId:id,sender:author,recipient:receiver,contextVersion:hash,current:true,expectedVersion:hash,canReply:true,entries:[entry],nextBefore:null};
const summary={trust:"authoritative_receipts",executionAvailable:true,references:[{kind:"result",taskId:id,id,revision:hash,data:{commit:"b".repeat(40),workingTree:"dirty",branch:"codex/task-fixture"}}]};
let checks=0;
try{
 for(const locale of ["pl","en"])for(const width of [390,1440])for(const mode of ["send","reply","stale"]){
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));await page.addInitScript(l=>localStorage.setItem("companycoreLocale",l),locale);
  const sender=mode==="send"?{...author,principal:{kind:"user",id}}:receiver,recipient=mode==="send"?receiver:author;
  let recorded=false,failOnce=mode==="send",requests=[];
  const data=()=>({task:{id,title:"Synthetic parser clarification"},source:{},contextVersion:hash,expectedVersion:hash,senderChoices:[sender],recipientChoices:[recipient],relatedTaskIds:[id],threads:mode==="send"&&!recorded?[]:[{...thread}],selected:mode==="send"&&!recorded?null:{...thread,current:mode!=="stale",canReply:mode!=="stale",entries:[entry]},canManageGrants:false,grants:[],summary,canSend:true});
  await page.route("**/v1/agent-runtime/**",async route=>{if(route.request().method()==="GET")return route.fulfill({json:{data:data()}});const body=route.request().postDataJSON();requests.push(body);if(failOnce){failOnce=false;return route.fulfill({status:503,json:{error:"temporary_fixture_failure"}});}recorded=true;return route.fulfill({status:201,json:{data:{entry:{...entry,threadId:id},replayed:false}}});});
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.getByRole("dialog").waitFor();
  const t=locale==="pl"?{sender:"Twoja rola w zadaniu",recipient:"Rola odbiorcy",text:"Doprecyzowanie",send:"Wyślij doprecyzowanie",history:"Rozmowa",reply:"Odpowiedz",ack:"Potwierdź odczyt tej wersji",details:"Szczegóły potwierdzenia",reason:"Dlaczego potrzebna jest formalna ocena",signal:"Wymaga formalnej oceny"}:{sender:"Your task role",recipient:"Recipient role",text:"Clarification",send:"Send clarification",history:"Conversation",reply:"Reply",ack:"Acknowledge this version",details:"Receipt details",reason:"Why formal review is needed",signal:"Requires formal review"};
  if(mode==="send"){
   await page.getByLabel(t.sender,{exact:true}).selectOption(`${id}:executor`);await page.getByLabel(t.recipient,{exact:true}).selectOption(`${id}:verifier`);assert.equal(await page.getByRole("button",{name:t.send,exact:true}).isDisabled(),true);checks++;
   await page.getByLabel(t.text,{exact:true}).fill("Which recorded test covers empty input?");
   await page.getByLabel(locale==="pl"?"Typ wiadomości":"Message type",{exact:true}).selectOption("constraint_notice");assert.equal(await page.getByRole("button",{name:t.send,exact:true}).isDisabled(),true);checks++;
   await page.getByLabel(t.reason,{exact:true}).fill("The accepted input assumption needs formal review");await page.getByRole("button",{name:t.send,exact:true}).click();await page.getByText(locale==="pl"?"Nie zapisano. Sprawdź aktualny kontekst, odbiorcę i dokładny grant, a następnie ponów.":"Not recorded. Check the current context, recipient and exact grant, then retry.").waitFor();
   await page.getByRole("button",{name:t.send,exact:true}).click();await page.getByRole("button",{name:locale==="pl"?"Popraw nową wiadomością":"Correct with a new message"}).waitFor();assert.equal(requests.length,2);assert.equal(requests[0].requestId,requests[1].requestId);assert.equal(requests[0].content.material.category,"constraint");checks+=3;
  }else{
   await page.getByLabel(t.history,{exact:true}).selectOption(id);await page.getByText(t.signal,{exact:true}).waitFor();checks++;
   if(mode==="reply"){
    await page.getByRole("button",{name:t.ack,exact:true}).click();assert.equal(requests[0].entryId,id);assert.equal(requests[0].entryVersion,1);checks+=2;
    await page.getByRole("button",{name:t.reply,exact:true}).first().click();await page.getByLabel(t.text,{exact:true}).fill("The fixture result is recorded in the execution receipt");await page.getByRole("button",{name:t.reply,exact:true}).last().click();assert.equal(requests[1].content.type,"answer");checks++;
   }else{assert.equal(await page.getByRole("button",{name:t.reply,exact:true}).isDisabled(),true);assert.equal(await page.getByRole("button",{name:t.ack,exact:true}).isDisabled(),true);checks+=2;}
  }
  if(mode!=="send"){const filter=page.getByLabel(locale==="pl"?"Filtr wiadomości":"Filter messages",{exact:true});await filter.selectOption("evidence_response");assert.equal(await page.getByText(content.text,{exact:true}).count(),0);await filter.selectOption("all");checks++;}
  await page.getByText(t.details,{exact:true}).click();assert.ok((await page.locator("section").last().innerText()).includes("bbbbbbbb"));checks++;
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);checks++;
  assert.deepEqual(errors,[]);checks++;await page.screenshot({path:path.join(output,`${locale}-${width}-${mode}.png`),fullPage:true});await context.close();
 }
 console.log(JSON.stringify({checks,status:"passed",output}));
}finally{await browser.close();server.close();}
