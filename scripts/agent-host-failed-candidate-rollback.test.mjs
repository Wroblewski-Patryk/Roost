import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomUUID,createHmac } from 'node:crypto';
import { readFileSync,writeFileSync,existsSync,realpathSync,linkSync,unlinkSync } from 'node:fs';
import { createNativeOwnedRepositoryTemp,inspectNativeOwnedTemp,cleanupNativeOwnedTemp } from './lib/agent-host-native-footprint.mjs';
import { readDurableNativeReview } from './lib/agent-host-native-review.mjs';
import { issueNativeReconciliationApproval,reconcileNativeArtifacts,qualifyNativeReconciliation } from './lib/agent-host-native-reconciliation.mjs';
import { rollbackFailedAddedCandidate } from './lib/agent-host-failed-candidate-rollback.mjs';
const windows={skip:process.platform!=='win32',timeout:240000};
const url=name=>new URL('./lib/'+name,import.meta.url).href;
const child=`
import path from 'node:path';import{mkdirSync,writeFileSync}from'node:fs';import{execFileSync}from'node:child_process';import{randomUUID}from'node:crypto';
import{acquireWriterLock}from${JSON.stringify(url('agent-host-writer-lock.mjs'))};
import{acquireApplicationLease}from${JSON.stringify(url('agent-host-application-lease.mjs'))};
import{captureNativeFootprint,compareNativeFootprint,nativeDigest}from${JSON.stringify(url('agent-host-native-footprint.mjs'))};
import{createNativeReview,captureNativeReview,completeNativeReview,nativeReviewLocation}from${JSON.stringify(url('agent-host-native-review.mjs'))};
import{buildWindowsJobLauncher,startWindowsJob}from${JSON.stringify(url('agent-host-windows-job.mjs'))};
const root=process.argv[1],mode=process.argv[2],repo=path.join(root,'repository'),state=path.join(root,'state');mkdirSync(state);
const git=args=>execFileSync('git',args,{cwd:repo,windowsHide:true,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const baseBranch='codex/gate4-pwa-baseline';git(['init','--initial-branch='+baseBranch]);git(['config','user.name','Synthetic Worker']);git(['config','user.email','worker@invalid.local']);git(['remote','add','origin','https://github.com/example/fixture.git']);
writeFileSync(path.join(repo,'baseline.txt'),'synthetic baseline\\n');git(['add','--','baseline.txt']);git(['-c','commit.gpgsign=false','commit','-m','fixture baseline']);
const head=git(['rev-parse','HEAD']),identity={executionId:randomUUID(),workspaceId:randomUUID(),taskId:randomUUID(),applicationId:randomUUID(),attempt:1};
const branch='codex/task-'+identity.taskId;git(['switch','-c',branch]);
const writer=await acquireWriterLock(state);await writer.checkpoint({...identity,id:identity.executionId,checkpointVersion:4,checkpoint:{schemaVersion:'roost-recovery-v1',stage:'spawn_intent',sessionId:writer.sessionId,headCommit:head,branch}});
const lease=acquireApplicationLease({writerLock:writer,applicationId:identity.applicationId,attempt:identity.executionId,runtime:{required:false,ports:[]}});
const spentPath=path.join(state,'synthetic-spent.json');writeFileSync(spentPath,JSON.stringify({state:'dispatch_reserved',attemptDigest:nativeDigest(identity)}),{flag:'wx'});
const expected={head,branch,origin:'https://github.com/example/fixture.git'},before=captureNativeFootprint(repo,expected);
const review=createNativeReview({writerLock:writer,applicationLease:lease,envelope:{identity,revisions:{ready:'a'.repeat(64)}},rootIdentity:before.rootIdentity,preFootprintDigest:before.digest,spentPath});
const launcher=await buildWindowsJobLauncher(root);
const program=mode==='modified'?${JSON.stringify("require('fs').writeFileSync('baseline.txt','modified')")}:${JSON.stringify("require('fs').writeFileSync('added.test.mjs',"+JSON.stringify("import test from 'node:test';import assert from 'node:assert/strict';test('synthetic failed candidate',()=>assert.fail('candidate requires correction'));\n")+")")};
const job=await(await startWindowsJob(launcher,{executable:process.execPath,argv:['-e',program],cwd:repo,environment:{SystemRoot:process.env.SystemRoot},input:'',attempt:identity.executionId,durationMs:10000})).completion;
if(job.rootExit!==0)throw Error('synthetic candidate child did not complete');
const after=captureNativeFootprint(repo,expected),comparison=compareNativeFootprint(before,after,['added.test.mjs','baseline.txt']);
captureNativeReview(review,{ownedTreeReceipt:job,comparison,postFootprintDigest:after.digest,violations:comparison.violations});
let exit=1;if(mode!=='modified'){const v=await(await startWindowsJob(launcher,{executable:process.execPath,argv:['--test','added.test.mjs'],cwd:repo,environment:{SystemRoot:process.env.SystemRoot},input:'',attempt:identity.executionId,durationMs:10000})).completion;exit=v.rootExit;}
await completeNativeReview(review,{verify:()=>({after:{exit,passed:false},testUnchanged:true,baselineCommitUnchanged:true,minimalChange:true})});
process.stdout.write(JSON.stringify({directory:nativeReviewLocation(review),repositoryPath:repo,baselineCommit:head,taskBranch:branch,baseBranch,origin:expected.origin,writePaths:['added.test.mjs','baseline.txt']})+'\\n');
`;
function fixture(t,mode='added') {
  const attempt=randomUUID(),proof=createNativeOwnedRepositoryTemp(realpathSync.native(os.tmpdir()),attempt),root=inspectNativeOwnedTemp(proof,attempt).root;
  t.after(()=>{assert.equal(cleanupNativeOwnedTemp(proof,attempt).remaining,0);});
  const options=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',child,root,mode],{windowsHide:true,encoding:'utf8',timeout:40000,maxBuffer:16384,stdio:['ignore','pipe','pipe']}));
  const scopes=[];return {root,options,scopes,run:extra=>rollbackFailedAddedCandidate({...options,assertOwnerAuthority(scope){scopes.push(scope);assert.equal(scope.operation,'restore_task_changes');assert.equal(scope.executionId,readDurableNativeReview(options.directory).payload.binding.identity.executionId);},...extra})};
}
function git(root,args){return execFileSync('git',args,{cwd:root,windowsHide:true,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();}
function resignReview(x,change){const file=path.join(x.options.directory,'review.json'),r=JSON.parse(readFileSync(file));change(r.payload);const key=readFileSync(path.join(x.options.directory,'integrity.key'));r.signature=createHmac('sha256',key).update(Buffer.from(JSON.stringify(r.payload)+'\n')).digest('hex');writeFileSync(file,JSON.stringify(r)+'\n');}
async function resumeStoppedFixture(x) {
  // Other native tests can briefly reuse an exited fixture PID. The production
  // guard must keep refusing that state. Probe the signed chain again before a
  // bounded retry; no fabricated identity, cleanup receipt or accepted result.
  for(let attempt=0;attempt<3;attempt++) {
    const q=qualifyNativeReconciliation(x.options.directory);
    if(!q.eligible && !q.missingEvidence.some(v=>['native_recovery_pid_reused','native_recovery_process_alive'].includes(v)))assert.fail(JSON.stringify(q));
    if(q.eligible) {
      try { return await x.run(); }
      catch(error) { if(error.message!=='failed_candidate_rollback_unproven'||!error.stack.includes('at check '))throw error; }
    }
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  assert.fail('fixture original process identities were not absent at bounded retry');
}

test('real stopped Windows Job failed candidate: archive, exact rollback, task branch removal, then normal signed cleanup',windows,async t=>{
  const x=fixture(t),before=readFileSync(path.join(path.dirname(x.options.directory),'agent-host-writer.lock'));
  const bytes=readFileSync(path.join(x.options.repositoryPath,'added.test.mjs'));
  const result=await x.run();assert.equal(result.completed,true);assert.equal(result.writerLeaseRetained,true);
  assert.equal(git(x.options.repositoryPath,['status','--porcelain=v1']), '');assert.equal(git(x.options.repositoryPath,['symbolic-ref','--short','HEAD']),x.options.baseBranch);
  assert.deepEqual(readFileSync(path.join(x.options.directory,'failed-candidate-rollback-bytes','0.bin')),bytes);
  assert.deepEqual(readFileSync(path.join(path.dirname(x.options.directory),'agent-host-writer.lock')),before);
  assert.ok(x.scopes.length>3);for(const forbidden of ['added.test.mjs',x.root,'assert.fail','fixture.git'])assert.ok(!JSON.stringify(result).includes(forbidden));
  assert.equal((await x.run()).replay,true);
  const grant=issueNativeReconciliationApproval({directory:x.options.directory,assertOwnerAuthority(){}});
  assert.equal(reconcileNativeArtifacts(grant).completed,true);assert.equal(existsSync(path.join(path.dirname(x.options.directory),'agent-host-writer.lock')),false);
  assert.equal((await x.run()).replay,true);
});

test('failed modified tracked candidate is retained; content/identity/hardlink/scope/review drift deny before effects',windows,async t=>{
  const modified=fixture(t,'modified');await assert.rejects(modified.run(),/rollback_unproven/);assert.equal(git(modified.options.repositoryPath,['status','--porcelain=v1']),'M baseline.txt');
  const x=fixture(t),file=path.join(x.options.repositoryPath,'added.test.mjs'),bytes=readFileSync(file);
  await assert.rejects(x.run({writePaths:['baseline.txt']}),/rollback_unproven/);
  writeFileSync(file,Buffer.concat([bytes,Buffer.from('drift')]));await assert.rejects(x.run(),/rollback_unproven/);writeFileSync(file,bytes);
  // A restored-byte but changed metadata candidate remains denied as intended.
  await assert.rejects(x.run(),/rollback_unproven/);assert.equal(existsSync(file),true);
  const h=fixture(t),hfile=path.join(h.options.repositoryPath,'added.test.mjs'),alias=path.join(h.options.repositoryPath,'linked.mjs');linkSync(hfile,alias);
  await assert.rejects(h.run(),/native_|rollback_unproven/);unlinkSync(alias);
  const foreign=fixture(t);writeFileSync(path.join(foreign.options.repositoryPath,'foreign.txt'),'foreign');await assert.rejects(foreign.run(),/rollback_unproven/);
  const wrong=fixture(t);await assert.rejects(wrong.run({origin:'https://github.com/example/wrong.git'}),/native_|rollback_unproven/);
  const review=fixture(t);resignReview(review,p=>{p.public.violations=['synthetic_violation'];});await assert.rejects(review.run(),/rollback_unproven/);
});

for(const stop of ['remove_intent','file_removed','branch_switched','branch_deleted','complete'])test(`durable ${stop} interruption resumes from actual state without replaying application effects`,windows,async t=>{
  const x=fixture(t);let hit=false;
  await assert.rejects(x.run({onCheckpoint(stage){if(stage===stop&&!hit){hit=true;throw Error('synthetic interruption');}}}),/synthetic interruption/);
  assert.equal(hit,true);assert.equal(existsSync(path.join(path.dirname(x.options.directory),'agent-host-writer.lock')),true);
  assert.equal(existsSync(path.join(path.dirname(x.options.directory),'agent-host-recovery.lock')),true);
  const r=await resumeStoppedFixture(x);assert.equal(r.completed,true);assert.equal(existsSync(path.join(path.dirname(x.options.directory),'agent-host-recovery.lock')),false);
  assert.equal(git(x.options.repositoryPath,['status','--porcelain=v1']),'');
});

test('revoked owner authority and post-intent foreign file retain exact Writer and recovery barrier',windows,async t=>{
  const x=fixture(t);let valid=true;
  await assert.rejects(x.run({assertOwnerAuthority(){if(!valid)throw Error('owner revoked');},onCheckpoint(stage){if(stage==='remove_intent')valid=false;}}),/owner revoked/);
  assert.equal(existsSync(path.join(x.options.repositoryPath,'added.test.mjs')),true);
  valid=true;writeFileSync(path.join(x.options.repositoryPath,'foreign.txt'),'foreign');await assert.rejects(x.run(),/rollback_unproven/);
  assert.equal(existsSync(path.join(path.dirname(x.options.directory),'agent-host-recovery.lock')),true);
});

test('branch transition never conceals foreign Git configuration drift',windows,async t=>{
  const x=fixture(t);
  await assert.rejects(x.run({onCheckpoint(stage){if(stage==='branch_switched')git(x.options.repositoryPath,['config','synthetic.foreign','changed']);}}),/rollback_unproven/);
  assert.equal(existsSync(path.join(path.dirname(x.options.directory),'agent-host-writer.lock')),true);
  assert.equal(existsSync(path.join(path.dirname(x.options.directory),'agent-host-recovery.lock')),true);
  assert.equal(git(x.options.repositoryPath,['rev-parse',`refs/heads/${x.options.taskBranch}`]),x.options.baselineCommit);
});
