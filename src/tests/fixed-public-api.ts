import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import { prisma } from "../db/prisma";
import { createAuthToken } from "../auth/token";

export const fixedAdmissionCommits = new WeakMap<object,string>();
const fixed = require("../../scripts/lib/agent-host-fixed-program.cjs");
const pause = () => new Promise(resolve => setTimeout(resolve,100));

export function registerFixedPublicTests(h: any) {
  test("fixed synthetic public API Worker E2E", {skip:process.platform!=="win32",timeout:180000},async t=>{
    h.restoreAdmission(); // Real production admission; the legacy API fixture mock is disabled.
    t.after(()=>h.restoreLegacyAdmission());
    const previous = process.env.ROOST_CODEX_EXECUTION_ENABLED;
    process.env.ROOST_CODEX_EXECUTION_ENABLED="true";
    t.after(()=>{if(previous===undefined)delete process.env.ROOST_CODEX_EXECUTION_ENABLED;else process.env.ROOST_CODEX_EXECUTION_ENABLED=previous;});
    for(const fault of [false,true]) await t.test(fault?"missing resume receipt has zero effect":"complete and independently review actual fixed effect",async scenario=>{
      const parent=fs.realpathSync.native(os.tmpdir()),root=fs.mkdtempSync(path.join(parent,"roost-public-fixed-"));
      const repository=path.join(root,"DemoApp"),state=path.join(root,"state");fs.mkdirSync(repository);fs.mkdirSync(state);
      scenario.after(()=>{
        if(!fs.existsSync(root))return;
        assert.equal(fs.realpathSync.native(root),root);assert.equal(path.dirname(root),parent);
        // An incomplete owned chain must remain inspectable, never blanket-deleted.
        assert.equal(fs.readdirSync(state).some(n=>n.endsWith(".lock")||n.endsWith(".lease")),false);
        fs.rmSync(root,{recursive:true});
      });
      const git=(args:string[])=>execFileSync("git",args,{cwd:repository,windowsHide:true,encoding:"utf8"}).trim();
      git(["init","--initial-branch=main"]);git(["-c","user.name=Synthetic Test","-c","user.email=fixture@example.test","commit","--allow-empty","-m","Synthetic fixture"]);
      git(["remote","add","origin","https://github.com/example-org/DemoApp.git"]);const commit=git(["rev-parse","HEAD"]);
      const owner=await h.registerOwner(`fixed-${randomUUID()}@example.test`,"Fixed synthetic fixture"),workspaceId=owner.workspace.id,auth={Authorization:`Bearer ${owner.token}`};
      const post=(url:string,body:any,headers:any=auth)=>h.request(url,{method:"POST",headers,body:JSON.stringify(body)});
      const app=await prisma.application.create({data:{workspaceId,name:"Fixed fixture",slug:"demoapp"}}),project=await prisma.project.create({data:{workspaceId,name:"Fixed fixture"}});
      await prisma.applicationProject.create({data:{applicationId:app.id,projectId:project.id}});
      await prisma.applicationRepository.create({data:{applicationId:app.id,name:"Fixture",url:"https://github.com/example-org/DemoApp.git",isPrimary:true}});
      const task=await prisma.task.create({data:{workspaceId,projectId:project.id,title:"Verify the fixed synthetic effect"}}),route=`/v1/agent-runtime/tasks/${task.id}`;
      git(["checkout","-b",`codex/task-${task.id}`]);
      const f=await h.prepareReadyFixture(workspaceId,task.id,app.id,auth,false);
      f.input.contract.executionClass=fixed.program;f.input.contract.budgets.maxAttempts=1;
      fixedAdmissionCommits.set(f.input,commit);
      const reviewer=await prisma.user.create({data:{email:`fixed-reviewer-${randomUUID()}@example.test`,passwordHash:"synthetic-not-a-login"}});
      await prisma.workspaceMembership.create({data:{workspaceId,userId:reviewer.id,role:"member"}});
      const profile=await prisma.workforceEntity.create({data:{workspaceId,name:"Independent fixed reviewer",slug:"fixed-reviewer",type:"human",source:"user",externalId:reviewer.id,role:"reviewer",skillIndex:["javascript"],authorityScope:["task_verification"]}});
      f.input.contract.taskRoles.verifier={id:profile.id,revision:profile.updatedAt.toISOString()};
      const reviewerAuth={Authorization:`Bearer ${createAuthToken({workspaceId,userId:reviewer.id})}`};
      const submit=route+"/actions/submit-for-execution",ready=await post(submit,await h.submissionInput(submit,f.input,auth));assert.equal(ready.status,200,JSON.stringify(ready.body));
      const queued=await post("/v1/agent-runtime/executions",{taskId:task.id});assert.equal(queued.status,201,JSON.stringify(queued.body));const executionId=queued.body.data.id;
      const key=await post("/v1/api-keys",{name:"Fixed synthetic worker",profileId:"mcp_codex_worker"});assert.equal(key.status,201,JSON.stringify(key.body));
      const config=path.join(root,"config.json");fs.writeFileSync(config,JSON.stringify({host:{name:"Synthetic host",slug:"fixed-host"},workspaceRoot:root,executionProvider:fixed.declaration,repositories:{demoapp:{directory:"DemoApp",originUrl:"https://github.com/example-org/DemoApp.git"}}}));
      const injection=fault?`import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';const open=fs.openSync;fs.openSync=(file,...args)=>{if(String(file).endsWith('resume-authorized.json'))throw Error('synthetic_publication_crash');return open(file,...args);};syncBuiltinESMExports();`:"";
      const script=`${injection}const{runHost}=await import('./scripts/roost-codex-agent-host.mjs');const{acquireWriterLock}=await import('./scripts/lib/agent-host-writer-lock.mjs');process.on('message',()=>{process.emit('SIGTERM');process.disconnect();});await runHost({acquireLock:options=>acquireWriterLock(${JSON.stringify(state)},options)});process.exit(0);`;
      const child=spawn(process.execPath,["--input-type=module","-e",script],{windowsHide:true,stdio:["ignore","pipe","pipe","ipc"],env:{...process.env,ROOST_BASE_URL:h.getBaseUrl(),ROOST_AGENT_API_KEY:key.body.data.key,ROOST_AGENT_HOST_CONFIG:config}});
      const closed=once(child,"close");let logs="";child.stdout!.on("data",b=>logs+=b);child.stderr!.on("data",b=>logs+=b);
      let result:any;
      try {
        const deadline=Date.now()+45000;
        do{result=await prisma.agentExecution.findUniqueOrThrow({where:{id:executionId}});if(["completed","failed"].includes(result.status))break;await pause();}while(Date.now()<deadline);
        assert.equal(result.status,fault?"failed":"completed",JSON.stringify({status:result.status,error:result.errorState,logs}));
        const evidence=fault?result.errorState.details.syntheticEvidence:result.verification.synthetic;
        assert.equal(evidence.resumed,!fault);assert.equal(evidence.effectBytes,fault?0:22);assert.equal(evidence.job.activeProcesses,0);assert.equal(evidence.cleanup.fixtureAbsent,true);assert.equal(evidence.cleanup.applicationLeaseReleased,true);
        assert.equal(evidence.review.verdict,fault?"process_failed":"verified_candidate");
        assert.equal(result.attempt,1);
        const events=await prisma.agentExecutionEvent.findMany({where:{executionId},orderBy:{createdAt:"asc"}});
        assert.ok(events.some(e=>e.type==="claimed"));
        if(!fault){
          assert.equal(result.finalResponse,fixed.output.trim());assert.deepEqual(result.changedFiles,[]);assert.equal(git(["status","--porcelain"]),"");assert.equal(git(["rev-parse","HEAD"]),commit);
          await h.prepareRiskFixture(route+"/risk",f.input,auth);
          await h.prepareAdmissionFixture(route+"/risk-admission",f.input,auth);
          const v=(await h.request(route+"/review",{headers:reviewerAuth})).body.data;
          const reviewed=await post(route+"/actions/review",{requestId:randomUUID(),expectedVersion:v.expectedVersion,executionId,materialVersion:v.materialVersion,decision:"approve",summary:"Exact fixed effect and cleanup verified independently",evidence:[{kind:"test",reference:evidence.reviewDigest,result:"22 expected bytes; durable resume receipt; zero remaining processes and fixture"}]},reviewerAuth);
          assert.equal(reviewed.status,200,JSON.stringify(reviewed.body));
        }
        assert.equal((await post(`/v1/agent-runtime/executions/${executionId}/actions/retry`,{})).status,409);
        assert.equal((await post("/v1/agent-runtime/executions",{taskId:task.id})).status,409);
      } finally {
        if(child.connected)child.send("stop");
        const [code]=await closed;assert.equal(code,0,logs);
        assert.equal(fs.readdirSync(state).some(n=>n.endsWith(".lock")),false);
        assert.equal(fs.realpathSync.native(root),root);assert.equal(path.dirname(root),parent);fs.rmSync(root,{recursive:true});assert.equal(fs.existsSync(root),false);
      }
    });
  });
}
