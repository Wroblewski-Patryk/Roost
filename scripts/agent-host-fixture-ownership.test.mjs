import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { spawnSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { syncBuiltinESMExports } from "node:module";
import { acquireWriterLock } from "./lib/agent-host-writer-lock.mjs";
import { createDurableNativeFixture, inspectDurableNativeFixture, readOriginalFixture, readFixtureEvidence, cleanupDurableNativeFixture } from "./lib/agent-host-fixture-ownership.mjs";
import { buildWindowsJobLauncher, startWindowsJob } from "./lib/agent-host-windows-job.mjs";
import { qualifyNativeReconciliation, issueNativeReconciliationApproval, reconcileNativeArtifacts } from "./lib/agent-host-native-reconciliation.mjs";
import { b26Inventory } from "./lib/agent-host-b26-inventory.mjs";
const windows = { skip: process.platform !== "win32", timeout: 300000 };
function temp(t) { const parent = fs.realpathSync.native(os.tmpdir()), root = fs.mkdtempSync(path.join(parent, "roost-original-fixture-test-"));t.after(() => { assert.equal(path.dirname(root), parent); assert.ok(path.basename(root).startsWith("roost-original-fixture-test-")); fs.rmSync(root, { recursive: true, force: true }); });return root; }
test("original fixture receipt survives reload but copies, replacements, drift, expiry and replay do not confer authority", windows, async t => {
  const parent = temp(t), writerLock = await acquireWriterLock(path.join(parent, "state"));
  const identity = { executionId: randomUUID(), workspaceId: randomUUID(), taskId: randomUUID(), applicationId: randomUUID(), attempt: 1 };
  const options = { writerLock, identity, authorityDigest: "a".repeat(64), expiresAt: new Date(Date.now() + 60000).toISOString() };
  const proof = createDurableNativeFixture(parent, options), checked = inspectDurableNativeFixture(proof);
  assert.equal(readOriginalFixture(checked.directory, checked.root).digest, checked.birth.digest);
  const recordFile=path.join(checked.directory,"fixture-created.json"),raw=fs.readFileSync(recordFile),tampered=JSON.parse(raw);tampered.payload.identity.taskId=randomUUID();fs.writeFileSync(recordFile,JSON.stringify(tampered));assert.throws(()=>inspectDurableNativeFixture(proof));fs.writeFileSync(recordFile,raw);
  assert.throws(() => inspectDurableNativeFixture(structuredClone(proof)));assert.throws(() => createDurableNativeFixture(parent, options));
  for (const file of [path.join(checked.root, ".roost-attempt-owner"), path.join(checked.directory, "fixture-created.json"), path.join(checked.directory, "integrity.key"), path.join(parent, "state", "agent-host-writer.lock")]) {
    const hold = file + ".held";fs.renameSync(file, hold);fs.writeFileSync(file, fs.readFileSync(hold));
    try { assert.throws(() => inspectDurableNativeFixture(proof)); } finally { fs.unlinkSync(file);fs.renameSync(hold, file); }
  }
  const alias = path.join(parent, "alias");fs.symlinkSync(checked.root, alias, "junction");
  try { assert.throws(() => readOriginalFixture(checked.directory, alias)); } finally { fs.unlinkSync(alias); }
  assert.throws(() => readOriginalFixture(checked.directory, path.join(parent, "foreign")));
  const now = Date.now();const originalNow = Date.now;Date.now = () => now + 60001;
  try { assert.throws(() => inspectDurableNativeFixture(proof)); } finally { Date.now = originalNow; }
  cleanupDurableNativeFixture(proof);assert.equal(fs.existsSync(checked.root), false);
  await writerLock.release();
});
test("native acknowledgement gates actual suspended code and rejects missing receipt", windows, async t => {
  const root = temp(t), artifact = await buildWindowsJobLauncher(root), output = path.join(root, "ran.txt"), receipt = path.join(root, "durable.json");
  const code = `require('node:fs').writeFileSync(${JSON.stringify(output)},'ran')`;
  const run = confirmResume => startWindowsJob(artifact, { executable: process.execPath, argv: ["-e", code], cwd: root, environment: { SYSTEMROOT: process.env.SystemRoot }, input: "", durationMs: 5000, confirmResume });
  for (const type of ["missing", "nack", "crash-after-publish"]) await t.test(type, async () => {
    const h = await run(() => { assert.equal(fs.existsSync(output), false);if(type === "missing")return null;if(type === "crash-after-publish")fs.writeFileSync(receipt,"partial",{flag:"wx"});throw Error("synthetic nack"); });
    await assert.rejects(h.completion);assert.equal(fs.existsSync(output), false);
    if(fs.existsSync(receipt))fs.unlinkSync(receipt);
  });
  const h = await run(() => { assert.equal(fs.existsSync(output), false);const fd=fs.openSync(receipt,"wx");try{fs.writeFileSync(fd,"durable");fs.fsyncSync(fd);}finally{fs.closeSync(fd);}return "a".repeat(64); });
  const result = await h.completion;assert.equal(result.resumed,true);assert.equal(result.resumeReceipt,"a".repeat(64));assert.equal(fs.readFileSync(output,"utf8"),"ran");
});
test("partial original publication cannot be adopted after restart", windows, async t => {
  const parent=temp(t),writerLock=await acquireWriterLock(path.join(parent,"state")),identity={executionId:randomUUID(),workspaceId:randomUUID(),taskId:randomUUID(),applicationId:randomUUID(),attempt:1};
  const options={writerLock,identity,authorityDigest:"a".repeat(64),expiresAt:new Date(Date.now()+60000).toISOString()},open=fs.openSync;
  fs.openSync=(file,...args)=>{if(String(file).endsWith("fixture-created.json"))throw Error("synthetic publication interruption");return open(file,...args);};syncBuiltinESMExports();
  try{assert.throws(()=>createDurableNativeFixture(parent,options),/publication interruption/);}finally{fs.openSync=open;syncBuiltinESMExports();}
  assert.throws(()=>createDurableNativeFixture(parent,options));await writerLock.release();
});
test("controller process exit before acknowledgement leaves no executed code", windows, async t=>{
  const root=temp(t),output=path.join(root,"ran.txt"),module=new URL("./lib/agent-host-windows-job.mjs",import.meta.url).href;
  const source=`import {buildWindowsJobLauncher,startWindowsJob} from ${JSON.stringify(module)};const artifact=await buildWindowsJobLauncher(${JSON.stringify(root)});const h=await startWindowsJob(artifact,{executable:process.execPath,argv:['-e',${JSON.stringify(`require('node:fs').writeFileSync(${JSON.stringify(output)},'ran')`)}],cwd:${JSON.stringify(root)},environment:{SYSTEMROOT:process.env.SystemRoot},input:'',durationMs:5000,confirmResume(){process.exit(41)}});await h.completion;`;
  const child=spawnSync(process.execPath,["--input-type=module"],{input:source,windowsHide:true,encoding:"utf8",timeout:15000});assert.equal(child.status,41,child.stderr);
  await new Promise(resolve=>setTimeout(resolve,500));assert.equal(fs.existsSync(output),false);
});
test("raw handshake refuses timeout, malformed, wrong correlation, replay and pipe loss before code runs", windows, async t => {
  const root=temp(t), artifact=await buildWindowsJobLauncher(root), output=path.join(root,"ran.txt");
  for(const mode of ["timeout","malformed","wrong-attempt","wrong-job","wrong-challenge","stale-replay","nack","pipe-loss","controller-crash"])await t.test(mode,async()=>{
    const attempt=randomUUID(), child=spawn(artifact.executable,[],{windowsHide:true,stdio:["pipe","pipe","pipe"]});let buffer="",events=[];
    child.stdin.on("error",()=>{});child.stdout.on("data",chunk=>{buffer+=chunk;for(let n;(n=buffer.indexOf("\n"))>=0;){const e=JSON.parse(buffer.slice(0,n));buffer=buffer.slice(n+1);events.push(e);if(e.type!=="assigned")continue;
      assert.equal(fs.existsSync(output),false);
      const ack={version:"roost-windows-job-v2",attempt,job:e.job,challenge:e.challenge,receipt:"a".repeat(64),resume:true};
      if(mode==="timeout")continue;if(mode==="pipe-loss"){child.stdin.end();continue;}if(mode==="controller-crash"){child.kill();continue;}
      if(mode==="wrong-attempt")ack.attempt=randomUUID();if(mode==="wrong-job")ack.job=randomUUID();if(["wrong-challenge","stale-replay"].includes(mode))ack.challenge=randomUUID();if(mode==="nack")ack.resume=false;
      child.stdin.write(mode==="malformed"?"not json\n":JSON.stringify(ack)+"\n");
    }});
    const closed=new Promise(resolve=>child.once("close",resolve));child.stdin.write(JSON.stringify({version:"roost-windows-job-v2",attempt,executable:process.execPath,argv:["-e",`require('node:fs').writeFileSync(${JSON.stringify(output)},'ran')`],cwd:root,environment:{SYSTEMROOT:process.env.SystemRoot},input:"",durationMs:5000,stopMs:3000})+"\n");
    await closed;assert.equal(fs.existsSync(output),false);if(mode!=="controller-crash"){const r=events.find(e=>e.type==="receipt");assert.equal(r.resumed,false);assert.equal(r.activeProcesses,0);assert.equal(r.cleanup,true);}
  });
});
test("normal reconciliation rejects foreign inventory, runtime replacement and missing/cross-attempt receipts", windows, async t => {
  const parent=temp(t), child=spawnSync(process.execPath,[fileURLToPath(new URL("./fixtures/fixture-ownership-child.mjs",import.meta.url)),parent],{windowsHide:true,encoding:"utf8",timeout:60000});
  assert.equal(child.status,0,child.stderr);const fixture=JSON.parse(child.stdout),directory=fixture.directory;
  const original=readFixtureEvidence(directory,"fixture-created.json"),resume=readFixtureEvidence(directory,"resume-authorized.json");
  assert.equal(qualifyNativeReconciliation(directory).eligible,false);
  assert.equal(qualifyNativeReconciliation(directory,fixture).eligible,true);
  for (const name of ["fixture-created.json","fixture-ready.json","resume-authorized.json"]){const file=path.join(directory,name),held=file+".held";fs.renameSync(file,held);fs.writeFileSync(file,fs.readFileSync(held));try{assert.equal(qualifyNativeReconciliation(directory,fixture).eligible,false);}finally{fs.unlinkSync(file);fs.renameSync(held,file);}}
  assert.equal(qualifyNativeReconciliation(directory,{...fixture,root:parent}).eligible,false);
  const foreign=path.join(fixture.root,"foreign.txt");fs.writeFileSync(foreign,"foreign");assert.equal(qualifyNativeReconciliation(directory,fixture).eligible,false);fs.unlinkSync(foreign);
  const source=path.join(parent,"checkout","data.bin"),held=source+".held";fs.renameSync(source,held);fs.writeFileSync(source,fs.readFileSync(held));
  try{assert.equal(qualifyNativeReconciliation(directory,fixture).eligible,false);}finally{fs.unlinkSync(source);fs.renameSync(held,source);}
  // Rename changes ctime: restoring bytes is not restoring the frozen identity.
  assert.equal(qualifyNativeReconciliation(directory,fixture).eligible,false);
  assert.equal(readFixtureEvidence(directory,"fixture-created.json").digest,original.digest);assert.equal(readFixtureEvidence(directory,"resume-authorized.json").digest,resume.digest);
});
test("genuine stopped unresumed Job permits cleanup only, never a launch receipt", windows, async t=>{
  const parent=temp(t),child=spawnSync(process.execPath,[fileURLToPath(new URL("./fixtures/fixture-ownership-child.mjs",import.meta.url)),parent,"nack"],{windowsHide:true,encoding:"utf8",timeout:60000});assert.equal(child.status,0,child.stderr);
  const fixture=JSON.parse(child.stdout),directory=fixture.directory;
  assert.equal(fs.existsSync(path.join(directory,"resume-authorized.json")),false);assert.equal(qualifyNativeReconciliation(directory,fixture).eligible,true);
  const grant=issueNativeReconciliationApproval({directory,fixture,assertOwnerAuthority(){}});assert.equal(reconcileNativeArtifacts(grant).completed,true);assert.equal(fs.existsSync(fixture.root),false);
});
test("normal original-fixture recovery removes fixture before lease/Writer and retains receipts", windows, async t => {
  const parent=temp(t),child=spawnSync(process.execPath,[fileURLToPath(new URL("./fixtures/fixture-ownership-child.mjs",import.meta.url)),parent],{windowsHide:true,encoding:"utf8",timeout:60000});assert.equal(child.status,0,child.stderr);
  const fixture=JSON.parse(child.stdout),directory=fixture.directory;
  let concurrentChecked=false;
  for(const phase of ["fixture_remove_intent","fixture_removed","lease_remove_intent","writer_remove_intent"]){
    if(phase==="fixture_remove_intent"){
      const module=new URL("./lib/agent-host-native-reconciliation.mjs",import.meta.url).href;
      const source=`import fs from 'node:fs';import path from 'node:path';import {issueNativeReconciliationApproval,reconcileNativeArtifacts} from ${JSON.stringify(module)};const options=${JSON.stringify({directory,fixture})};const grant=issueNativeReconciliationApproval({...options,assertOwnerAuthority(){const p=path.join(options.directory,'reconciliation.json');if(fs.existsSync(p)&&JSON.parse(fs.readFileSync(p)).payload.phase==='fixture_remove_intent')process.exit(41)}});reconcileNativeArtifacts(grant);`;
      const stopped=spawnSync(process.execPath,["--input-type=module"],{input:source,windowsHide:true,encoding:"utf8",timeout:30000});assert.equal(stopped.status,41,stopped.stderr);
      assert.ok(fs.existsSync(path.join(directory,".reconciliation-controller.json")));
    }else{
      const grant=issueNativeReconciliationApproval({directory,fixture,assertOwnerAuthority(){const file=path.join(directory,"reconciliation.json");if(fs.existsSync(file)){const state=JSON.parse(fs.readFileSync(file)).payload;if(!concurrentChecked&&fs.existsSync(path.join(directory,".reconciliation-controller.json"))&&JSON.parse(fs.readFileSync(path.join(directory,".reconciliation-controller.json"))).payload.owner.pid===process.pid){concurrentChecked=true;const duplicate=issueNativeReconciliationApproval({directory,fixture,assertOwnerAuthority(){}});assert.throws(()=>reconcileNativeArtifacts(duplicate),/process_alive/);}if(state.phase===phase)throw Error("synthetic checkpoint");}}});
      assert.throws(()=>reconcileNativeArtifacts(grant),/synthetic checkpoint/);
    }
    assert.ok(fs.existsSync(path.join(parent,"state","agent-host-writer.lock")));
    if(phase==="fixture_remove_intent"){
      // Exact pending object absent after an effect/crash is the only permitted gap.
      const j=JSON.parse(fs.readFileSync(path.join(directory,"reconciliation.json"))).payload,inventory=b26Inventory(fixture.root),item=j.fixture.plan[j.fixture.pending],file=inventory.paths.get(item.pathDigest);
      assert.ok(file.startsWith(fixture.root+path.sep));if(item.kind==="directory")fs.rmdirSync(file);else fs.unlinkSync(file);
    }
  }
  const grant=issueNativeReconciliationApproval({directory,fixture,assertOwnerAuthority(){}});
  assert.throws(()=>reconcileNativeArtifacts(structuredClone(grant)));
  assert.equal(reconcileNativeArtifacts(grant).completed,true);assert.equal(fs.existsSync(fixture.root),false);
  assert.equal(concurrentChecked,true);assert.throws(()=>inspectDurableNativeFixture(grant));
  assert.equal(reconcileNativeArtifacts(grant).replay,true);assert.equal(qualifyNativeReconciliation(directory,fixture).completed,true);
  assert.ok(readFixtureEvidence(directory,"fixture-created.json"));assert.ok(readFixtureEvidence(directory,"resume-authorized.json"));
});
