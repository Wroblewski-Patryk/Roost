import assert from "node:assert/strict";
import test from "node:test";
import { validPacketFixture, sealPacket } from "./fixtures/execution-packet.mjs";
import { validateExecutionPacket } from "./lib/agent-host-execution-packet.mjs";
import { singleTaskIdentity, assertTaskBranch, readCurrentTaskBranch } from "./lib/agent-host-single-task.mjs";

const validate = f => validateExecutionPacket(sealPacket(f.packet), f.claimed, f.taskContext, f.applicationContext);
test("branch admission reads the real checkout and refuses a different task branch", async () => {
  const current = await readCurrentTaskBranch(process.cwd());
  assertTaskBranch(current, current);
  assert.throws(() => assertTaskBranch(current, "codex/task-synthetic-other"), e => e.message === "agent_task_branch_mismatch" && e.retryable === false);
});
test("single scope identity and branch are deterministic across attempts", () => {
  const f = validPacketFixture(); validate(f);
  assert.deepEqual(singleTaskIdentity(f.claimed.taskId), { contractId: f.packet.contract.singleTask.contractId, branch: f.packet.contract.singleTask.branch });
  f.claimed.attempt = 2; f.packet.contract.budgets.maxAttempts = 2; validate(f);
});
for (const [name, change] of Object.entries({
  missing: f => delete f.packet.contract.singleTask,
  application: f => f.packet.contract.singleTask.applicationId = f.claimed.id,
  component: f => f.packet.scopeAuthorities.component.applicationId = f.claimed.id,
  componentRevision: f => f.packet.scopeAuthorities.component.revision = "changed",
  managerWorkspace: f => f.packet.scopeAuthorities.manager.workspaceId = f.claimed.id,
  managerInactive: f => f.packet.scopeAuthorities.manager.status = "inactive",
  managerRevision: f => f.packet.scopeAuthorities.manager.revision = "changed",
  identity: f => f.packet.contract.singleTask.contractId = "other",
  branch: f => f.packet.contract.singleTask.branch = "main",
  listOutcome: f => f.packet.contract.objective.outcome = "Fix login; repair billing",
  compoundEnglish: f => f.packet.contract.singleTask.problems[0].statement = "Fix login and add billing",
  compoundPolish: f => f.packet.contract.singleTask.problems[0].statement = "Napraw logowanie oraz dodaj płatności",
  secondOutcome: f => f.packet.contract.singleTask.problems.push({ ...f.packet.contract.singleTask.problems[0], statement: "Other failure", outcome: "Ship unrelated feature" }),
  secondComponent: f => f.packet.contract.singleTask.problems.push({ ...f.packet.contract.singleTask.problems[0], statement: "Other failure", componentId: f.claimed.id }),
  noMeasurement: f => delete f.packet.contract.singleTask.measurement,
  nonnumericTarget: f => f.packet.contract.singleTask.measurement.target = "works",
  falseException: f => f.packet.contract.singleTask.commonCause = { mechanism: "One cause", inseparability: "Trust me", evidence: f.packet.contract.context.technical[0] },
  bag: f => f.packet.contract.singleTask.problems = Array.from({ length: 4 }, (_, i) => ({ ...f.packet.contract.singleTask.problems[0], statement: `Failure ${i}` }))
})) test(`single scope rejects ${name}`, () => {
  const f = validPacketFixture(); change(f);
  assert.throws(() => validate(f), e => e.message === "execution_packet_invalid" && e.retryable === false && e.details.issues.some(i => i.field.startsWith("contract.singleTask")));
});
test("common-cause exception requires per-symptom links and a current technical source", () => {
  const f = validPacketFixture(), s = f.packet.contract.singleTask;
  s.problems[0].causalLink = "The parser drops the shared required input token";
  s.problems.push({ ...s.problems[0], statement: "The same input is rejected during preview", causalLink: "The preview calls the same defective parser path" });
  assert.throws(() => validate(f));
  s.commonCause = { mechanism: "One parser drops the required input token", inseparability: "Both paths use the same parser; one correction must cover both observations", evidence: { ...f.packet.contract.context.technical[0] } };
  validate(f);
  s.commonCause.evidence.revision = "stale"; assert.throws(() => validate(f));
});

// A disposable checkout verifies committed additions/deletions independently of
// dirty-worktree reporting. No repository or global Git settings are changed.
test("result revision reads final Git HEAD and committed paths", async()=>{
 const {mkdtemp,writeFile,unlink,rm}=await import("node:fs/promises"),{tmpdir}=await import("node:os"),{join,resolve}=await import("node:path"),{promisify}=await import("node:util"),{execFile}=await import("node:child_process");
 const {readCurrentTaskCommit,readCommittedTaskPaths}=await import("./lib/agent-host-single-task.mjs");
 const directory=await mkdtemp(join(tmpdir(),"roost-result-revision-")),git=(...args)=>promisify(execFile)("git",args,{cwd:directory,windowsHide:true});
 try{
  await git("init","--initial-branch=codex/task-fixture");await writeFile(join(directory,"removed.txt"),"old");await git("add",".");await git("-c","user.name=Synthetic Fixture","-c","user.email=fixture@example.test","commit","-m","Base fixture");
  const base=await readCurrentTaskCommit(directory);await unlink(join(directory,"removed.txt"));await writeFile(join(directory,"changed file.txt"),"new");await git("add","-A");await git("-c","user.name=Synthetic Fixture","-c","user.email=fixture@example.test","commit","-m","Result fixture");
  const head=await readCurrentTaskCommit(directory);assert.notEqual(base,head);assert.equal(await readCurrentTaskBranch(directory),"codex/task-fixture");assert.deepEqual((await readCommittedTaskPaths(directory,base,head)).sort(),["changed file.txt","removed.txt"]);assert.deepEqual(await readCommittedTaskPaths(directory,head,head),[]);await assert.rejects(readCommittedTaskPaths(directory,"--bad",head),/agent_task_branch_mismatch/);
 }finally{assert.ok(resolve(directory).startsWith(resolve(tmpdir())+"\\" )||resolve(directory).startsWith(resolve(tmpdir())+"/"));await rm(directory,{recursive:true,force:true});}
});
