import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const {createHandoffSchema,decideHandoffSchema}=require("../dist/modules/agent-runtime/task-handoff-contract.js");
const {agentPrincipalRoute}=require("../dist/auth/agent-principal.js");
const id="00000000-0000-4000-8000-000000000001",hash="a".repeat(64);
const content={outcome:{summary:"Synthetic result",currentState:"Completed fixture"},decisions:{explanation:"Recorded source decisions"},changes:{areas:["Parser fixture"]},tests:{assessment:"Recorded fixture verification"},limits:{knownLimitations:"External paths untested",residualRisks:"No production evidence"},continuation:{reproduce:"Run the synthetic fixture",continue:"Inspect the current evidence",rollback:"Revert the fixture change"},expectedAction:{kind:"inspect",instruction:"Acknowledge exact material"}};
const body={requestId:id,expectedVersion:hash,sourceVersion:hash,senderRole:"executor",recipientRole:"verifier",recipient:{kind:"user",id},supersedes:null,content};
test("handoff requires every typed section and field",()=>{
 assert.ok(createHandoffSchema.safeParse(body).success);
 for(const [section,value] of Object.entries(content)){
  const missing=structuredClone(body);delete missing.content[section];assert.equal(createHandoffSchema.safeParse(missing).success,false,section);
  for(const field of Object.keys(value)){
   const removed=structuredClone(body);delete removed.content[section][field];assert.equal(createHandoffSchema.safeParse(removed).success,false,`${section}.${field}`);
  }
 }
 for(const key of ["requestId","expectedVersion","sourceVersion","senderRole","recipientRole","recipient","supersedes"]){const missing=structuredClone(body);delete missing[key];assert.equal(createHandoffSchema.safeParse(missing).success,false,key);}
 for(const extra of [{commit:"f".repeat(40)},{branch:"main"},{source:{fake:true}},{agentId:id},{executionId:id}])assert.equal(createHandoffSchema.safeParse({...body,...extra}).success,false);
 assert.equal(createHandoffSchema.safeParse({...body,content:{...content,outcome:{...content.outcome,rawLog:"untrusted"}}}).success,false);
});
test("one exact decision, with typed rejection sections and no implicit approval",()=>{
 const accept={requestId:id,expectedVersion:hash,handoffId:id,handoffVersion:1,decision:"accept"};
 assert.ok(decideHandoffSchema.safeParse(accept).success);
 assert.equal(decideHandoffSchema.safeParse({...accept,releaseApproval:true}).success,false);
 assert.equal(decideHandoffSchema.safeParse({...accept,decision:"approve"}).success,false);
 const reject={...accept,decision:"reject",code:"conflicting_section",reason:"Evidence contradicts the outcome",sections:["tests","outcome"]};
 assert.ok(decideHandoffSchema.safeParse(reject).success);
 for(const change of [{sections:[]},{sections:["arbitrary"]},{code:"other"},{reason:""},{handoffVersion:0},{handoffId:"wrong"}])assert.equal(decideHandoffSchema.safeParse({...reject,...change}).success,false);
});
test("credential-bound route allowlist adds only handoff reads and exact operations",()=>{
 const root=`/v1/agent-runtime/tasks/${id}/handoffs`;
 for(const [method,url] of [["GET",root],["POST",root],["POST",root+"/actions/accept"],["POST",root+"/actions/reject"]])assert.ok(agentPrincipalRoute(method,url),url);
 for(const [method,url] of [["DELETE",root],["PATCH",root],["POST",root+"/actions/execute"],["POST",`/v1/agent-runtime/tasks/${id}/actions/submit-for-execution`],["POST","/v1/agent-runtime/executions"],["POST",`/v1/agent-runtime/tasks/${id}/capability-grants`]])assert.equal(agentPrincipalRoute(method,url),false,url);
});
