import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, realpath, rm, mkdir } from "node:fs/promises";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { buildWindowsJobLauncher, startWindowsJob, isWindowsJobReceipt, hermesOwnedTreeBlockers } from "./lib/agent-host-windows-job.mjs";
import { classifyHermesOutcome } from "./lib/agent-host-hermes-budget.mjs";
import { runHermesOwnedProcess } from "./lib/agent-host-hermes-quiet.mjs";
import { validPacketFixture, pinReadyFixture } from "./fixtures/execution-packet.mjs";
import { prepareProviderInput } from "./lib/agent-host-provider-input.mjs";
import { projectProviderLaunch } from "./lib/agent-host-provider-launch.mjs";
import providerContract from "./lib/agent-host-provider-contract.cjs";
const exec=promisify(execFile), delay=ms=>new Promise(r=>setTimeout(r,ms));
const fixtureSource=fileURLToPath(new URL("./fixtures/windows-job-tree.cs",import.meta.url));
async function gone(pids) {
  for(let i=0;i<80;i++) {
    if(pids.every(pid=>{try{process.kill(pid,0);return false;}catch{return true;}})) return;
    await delay(50);
  }
  assert.fail("owned_fixture_process_remaining");
}
test("native Windows Job qualification (serial, owned fixtures only)", {skip:process.platform!=="win32",timeout:120000}, async t=>{
 const parent=await realpath(os.tmpdir()),directory=await mkdtemp(path.join(parent,"roost-job-native-test-"));
 const fixture=path.join(directory,"fixture with spaces.exe");
 const env={SystemRoot:process.env.SystemRoot};
 let current, foreign, controller;
 try {
  await exec(path.join(process.env.SystemRoot,"Microsoft.NET","Framework64","v4.0.30319","csc.exe"),["/nologo","/target:exe","/platform:x64",`/out:${fixture}`,fixtureSource],{windowsHide:true,timeout:30000});
  const artifact=await buildWindowsJobLauncher(directory),faulty=await buildWindowsJobLauncher(directory,{testFaults:true});
  async function run(mode,changes={},act) {
   let output="",assignment;
   current=await startWindowsJob(changes.fault?faulty:artifact,{executable:fixture,argv:[mode],cwd:directory,environment:env,input:"",durationMs:5000,
    onData:(channel,b)=>{if(channel==="stdout")output+=b.toString("utf8");},onAssigned:a=>{assignment=a;},...changes});
   try {
    if(act) await act(current,()=>output);
    const receipt=await current.completion;
    const pids=[...output.matchAll(/PID:(\d+)/g)].map(m=>Number(m[1]));
    if(assignment)pids.push(assignment.rootPid);
    await gone(pids);assert.equal(receipt.cleanup,true);assert.equal(receipt.activeProcesses,0);assert.ok(receipt.cleanupMs<=3000);
    return {receipt,output,pids,assignment};
   } finally {current.stop();await current.completion.catch(()=>{});current=null;}
  }
  async function treeReady(handle,output){for(let i=0;i<100;i++){if((output().match(/PID:/g)||[]).length>=3)return;await delay(20);}assert.fail("tree_not_started");}
  await t.test("natural exit plus exact stdin and argv quoting",async()=>{
   const args=["echo","","two words",'quote"slash\\','Zażółć'];const input="synthetic stdin 🐦";
   const r=await run("echo",{argv:args,input});assert.equal(r.receipt.rootExit,0);assert.ok(r.output.includes(input));
   for(const a of args.slice(1))assert.ok(r.output.includes("ARG:"+Buffer.from(a).toString("base64")));
   assert.ok(isWindowsJobReceipt(r.receipt));assert.equal(isWindowsJobReceipt({...r.receipt}),false);
   assert.deepEqual(hermesOwnedTreeBlockers(["hermes_stop_recovery_unproven","other"],r.receipt),["other"]);
   const f=validPacketFixture();pinReadyFixture(f);
   const envelope=prepareProviderInput({fresh:{taskContext:f.taskContext,applicationContext:f.applicationContext},claimed:f.claimed,currentCommit:"a".repeat(40),assertAuthority(){},secrets:[]});
   const pin=providerContract.registry.providers.find(p=>p.kind==="hermes_codex");
   const candidate=projectProviderLaunch({provider:{kind:"hermes_codex",enabled:true,officialSource:pin.officialSource,version:pin.version,commit:pin.commit,
    executablePath:"C:\\Fictional\\hermes.exe",policy:structuredClone(providerContract.registry.hermesPolicy)},envelope,
    repositoryPath:"C:\\Fictional\\App",sandbox:"workspace-write",ownedTreeReceipt:r.receipt});
   assert.equal(candidate.blockers.includes("hermes_stop_recovery_unproven"),false);
   assert.deepEqual(candidate.limits.blockers,candidate.blockers);
   assert.ok(candidate.blockers.includes("hermes_owner_attestation_required"));assert.equal(candidate.command,null);
  });
  await t.test("Hermes quiet runner uses native backend with a harmless fixture",async()=>{
   const result=await runHermesOwnedProcess({executable:fixture,argv:["echo"],cwd:directory,environment:env,input:"synthetic quiet input",
    remainingMs:()=>3000,assertAuthority:()=>{},secrets:[]});
   assert.ok(result.finalResponse.includes("synthetic quiet input"));assert.ok(isWindowsJobReceipt(result.ownedTreeReceipt));
   await gone([...result.finalResponse.matchAll(/PID:(\d+)/g)].map(m=>Number(m[1])));
  });
  await t.test("surviving child/grandchild are terminated after normal root exit",async()=>{
   const r=await run("survivor");assert.equal(r.pids.length,4);assert.equal(r.receipt.terminationReason,"root_exit");assert.equal(r.receipt.rootExit,0);
  });
  for(const reason of ["cancel","lease_lost","context_stop","controller_shutdown","preparation_failed"])
   await t.test(reason+" owns entire tree",async()=>{const r=await run("tree",{},async(h,o)=>{await treeReady(h,o);h.stop(reason);});assert.equal(r.receipt.terminationReason,reason);assert.equal(classifyHermesOutcome({ownedTreeReceipt:r.receipt}),["cancel","context_stop","controller_shutdown"].includes(reason)?"cancelled":"policy_blocked");});
  await t.test("deadline expires and stops silent descendants",async()=>{const r=await run("tree",{durationMs:650});assert.equal(r.receipt.terminationReason,"timeout");assert.equal(classifyHermesOutcome({ownedTreeReceipt:r.receipt}),"timed_out");});
  await t.test("controller EOF stops owned tree",async()=>{const r=await run("tree",{},async(h,o)=>{await treeReady(h,o);h.closeController();});assert.equal(r.receipt.terminationReason,"controller_closed");assert.equal(classifyHermesOutcome({ownedTreeReceipt:r.receipt}),"cancelled");});
  await t.test("launcher crash closes the sole job handle; no completion proof is invented",async()=>{
   let output="";current=await startWindowsJob(artifact,{executable:fixture,argv:["tree"],cwd:directory,environment:env,input:"",durationMs:5000,onData:(c,b)=>{if(c==="stdout")output+=b;}});
   await treeReady(current,()=>output);current.launcher.kill();await assert.rejects(current.completion,/stop_recovery_unproven/);
   await gone([...output.matchAll(/PID:(\d+)/g)].map(m=>Number(m[1])));current=null;
  });
  await t.test("abrupt Node controller crash closes control pipe and kills descendants",async()=>{
   const buildDir=path.join(directory,"controller-build");await mkdir(buildDir);
   controller=spawn(process.execPath,[fileURLToPath(new URL("./fixtures/windows-job-controller.mjs",import.meta.url)),buildDir,fixture],{windowsHide:true,stdio:["ignore","pipe","pipe"]});
   let output="";controller.stdout.on("data",b=>{output+=b;});
   await treeReady(controller,()=>output);
   const closed=new Promise(r=>controller.once("close",r));controller.kill();await closed;controller=null;
   const pids=[...output.matchAll(/(?:PID|LAUNCHER|LAUNCHER_ROOT):(\d+)/g)].map(m=>Number(m[1]));
   assert.ok(pids.length>=5);await gone(pids);
  });
  await t.test("nested current-host job permits atomic inner assignment",async()=>{
   const inner={version:"roost-windows-job-v1",attempt:randomUUID(),executable:fixture,argv:["natural"],cwd:directory,
    environment:env,input:"",durationMs:3000,stopMs:3000};
   const r=await run("natural",{executable:artifact.executable,argv:[],input:JSON.stringify(inner)+"\n"});
   const events=r.output.trim().split("\n").map(line=>JSON.parse(line));
   const assigned=events.find(e=>e.type==="assigned"),done=events.find(e=>e.type==="receipt");
   assert.equal(assigned.controllerInJob,true);assert.equal(assigned.assignedBeforeResume,true);
   assert.equal(done.cleanup,true);assert.equal(done.activeProcesses,0);
  });
  for(const channel of ["stdout","stderr"])await t.test(channel+" bound terminates job",async()=>{const r=await run(channel);assert.equal(r.receipt.terminationReason,"output_limit");});
  for(const [name,change] of Object.entries({executable:{executable:path.join(directory,"missing.exe")},cwd:{cwd:path.join(directory,"missing")},argv:{argv:[null]},assign:{fault:"assign"},resume:{fault:"resume"}}))
   await t.test(name+" preparation failure leaves no running code",async()=>{const r=await run("tree",change);assert.equal(r.receipt.resumed,false);assert.equal(r.output,"");assert.equal(isWindowsJobReceipt(r.receipt),false);});
  await t.test("breakaway denied; unrelated concurrent process preserved",async()=>{
   foreign=spawn(fixture,["foreign"],{windowsHide:true,stdio:["ignore","pipe","ignore"]});
   const r=await run("breakaway");assert.ok(r.output.includes("BREAKAWAY:denied"));assert.equal(foreign.exitCode,null);
   await run("tree",{},async(h,o)=>{await treeReady(h,o);h.stop("cancel");});assert.equal(foreign.exitCode,null);
   foreign.kill();await new Promise(r=>foreign.once("close",r));foreign=null;
  });
 } finally {
  if(current){current.stop();await current.completion.catch(()=>{});}
  if(controller){const closed=new Promise(r=>controller.once("close",r));controller.kill();await closed;}
  if(foreign){foreign.kill();await new Promise(r=>foreign.once("close",r));}
  assert.equal(path.dirname(directory),parent);assert.ok(path.basename(directory).startsWith("roost-job-native-test-"));
  assert.equal(await realpath(directory),directory);
  await rm(directory,{recursive:true,force:true});
 }
});
