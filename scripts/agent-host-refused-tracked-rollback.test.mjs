import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { randomUUID,createHmac } from 'node:crypto';
import { mkdirSync,readFileSync,writeFileSync,existsSync,realpathSync,renameSync,linkSync,unlinkSync } from 'node:fs';
import { inspectRefusedTrackedRollbackScope,rollbackRefusedTrackedCandidate,verifyRefusedTrackedRollbackDisposition } from './lib/agent-host-refused-tracked-rollback.mjs';
import { createNativeReview,prepareNativeReviewResume,authorizeNativeReviewResume,captureNativeReview,completeNativeReview,nativeReviewLocation,readDurableNativeReview } from './lib/agent-host-native-review.mjs';
import { nativeDigest,captureNativeFootprint,compareNativeFootprint,createNativeOwnedRepositoryTemp,inspectNativeOwnedTemp,cleanupNativeOwnedTemp } from './lib/agent-host-native-footprint.mjs';
import { acquireWriterLock } from './lib/agent-host-writer-lock.mjs';
import { acquireApplicationLease } from './lib/agent-host-application-lease.mjs';
import { fixtureRuntimeBinding } from './lib/agent-host-fixture-ownership.mjs';
import { buildWindowsJobLauncher,startWindowsJob } from './lib/agent-host-windows-job.mjs';
import { issueNativeReconciliationApproval,reconcileNativeArtifacts,qualifyNativeReconciliation } from './lib/agent-host-native-reconciliation.mjs';
import { legacyRecoveryIdentityDigest,legacyInputIdentityVersion } from './lib/agent-host-recovery-identity.mjs';

const windows={skip:process.platform!=='win32',timeout:180000};
const files=['source-a.txt','source-b.txt','source-c.txt','source-d.txt'];
const git=(root,...args)=>execFileSync('git',['-c','core.fsmonitor=false','-c','core.untrackedCache=false',...args],{cwd:root,
  env:{...process.env,GIT_OPTIONAL_LOCKS:'0'},windowsHide:true,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();

if(process.argv[2]==='refused-tracked-child') {
  const root=process.argv[3],mode=process.argv[4]??'modified',repositoryPath=path.join(root,'repository'),state=path.join(root,'state');mkdirSync(state);
  let identity={executionId:randomUUID(),workspaceId:randomUUID(),taskId:randomUUID(),applicationId:randomUUID(),attempt:1};
  if(mode==='json-order')identity=Object.fromEntries(Object.entries(identity).sort(([a],[b])=>a.localeCompare(b)));
  const baseBranch='main',taskBranch=`codex/task-${identity.taskId}`,origin='https://example.invalid/RefusedTracked.git';
  git(repositoryPath,'init','-b',baseBranch);git(repositoryPath,'config','user.name','Synthetic Worker');git(repositoryPath,'config','user.email','fixture@example.invalid');
  git(repositoryPath,'config','core.autocrlf','true');git(repositoryPath,'remote','add','origin',origin);
  for(const f of files)writeFileSync(path.join(repositoryPath,f),`synthetic ${f}\r\nsecond baseline line\r\n`);
  writeFileSync(path.join(repositoryPath,'unchanged.txt'),'unrelated baseline\r\n');
  git(repositoryPath,'add','--',...files,'unchanged.txt');git(repositoryPath,'-c','commit.gpgsign=false','commit','-m','fixture baseline');
  const baselineCommit=git(repositoryPath,'rev-parse','HEAD');git(repositoryPath,'switch','-c',taskBranch);
  if(mode==='pre-filter')git(repositoryPath,'config','filter.external.smudge','echo forbidden');
  const expected={head:baselineCommit,branch:taskBranch,origin},before=captureNativeFootprint(repositoryPath,expected),writer=await acquireWriterLock(state);
  await writer.checkpoint({...identity,id:identity.executionId,checkpointVersion:4,checkpoint:{schemaVersion:'roost-recovery-v1',stage:'spawn_intent',sessionId:writer.sessionId,headCommit:baselineCommit,branch:taskBranch}});
  const lease=acquireApplicationLease({writerLock:writer,applicationId:identity.applicationId,attempt:identity.executionId,runtime:{required:false,ports:[]}});
  const spentPath=path.join(state,'synthetic-spent.json');writeFileSync(spentPath,JSON.stringify({state:'dispatch_reserved',attemptDigest:mode==='json-order'?legacyRecoveryIdentityDigest(identity,legacyInputIdentityVersion):nativeDigest(identity)}),{flag:'wx'});
  const review=createNativeReview({writerLock:writer,applicationLease:lease,envelope:{identity,revisions:{ready:'a'.repeat(64)}},rootIdentity:before.rootIdentity,preFootprintDigest:before.digest,spentPath});
  const launcher=await buildWindowsJobLauncher(root),authorityDigest=nativeDigest('synthetic exact owner recovery'),runtime={executable:fixtureRuntimeBinding(process.execPath),node:fixtureRuntimeBinding(process.execPath),launcher:fixtureRuntimeBinding(launcher.executable),deadline:new Date(Date.now()+60000).toISOString()};
  prepareNativeReviewResume(review,{runtime,authorityDigest});
  const program=mode==='added'?"require('fs').writeFileSync('foreign.txt','new')":mode==='deleted'?"require('fs').unlinkSync('source-a.txt')":mode==='outside'?"require('fs').writeFileSync('unchanged.txt','foreign modification')":`for(const f of ${JSON.stringify(files)})require('fs').writeFileSync(f,require('fs').readFileSync(f,'utf8')+'refused candidate\\r\\n');`;
  const job=await(await startWindowsJob(launcher,{executable:process.execPath,argv:['-e',program],cwd:repositoryPath,environment:{SystemRoot:process.env.SystemRoot},input:'',attempt:identity.executionId,durationMs:10000,
    confirmResume:assignment=>authorizeNativeReviewResume(review,{assignment,runtime,authorityDigest})})).completion;
  const after=captureNativeFootprint(repositoryPath,expected),comparison=compareNativeFootprint(before,after,files);
  captureNativeReview(review,{ownedTreeReceipt:job,comparison,postFootprintDigest:after.digest,violations:comparison.violations});
  const result=await completeNativeReview(review,{verify(){throw Error('coding_tests_unproven');},installation:()=>({status:'PASS',manifestDigest:'d'.repeat(64)})});
  if(mode==='modified')assert.equal(result.publicReceipt.verdict,'verification_blocked');
  process.stdout.write(JSON.stringify({directory:nativeReviewLocation(review),repositoryPath,baselineCommit,taskBranch,baseBranch,origin,writePaths:files,state,spentPath})+'\n');
}else{
function fixture(t,mode='modified') {
  const attempt=randomUUID(),owned=createNativeOwnedRepositoryTemp(realpathSync.native(os.tmpdir()),attempt),root=inspectNativeOwnedTemp(owned,attempt).root;
  t.after(()=>{assert.equal(cleanupNativeOwnedTemp(owned,attempt).remaining,0);assert.equal(existsSync(root),false);});
  const options=JSON.parse(execFileSync(process.execPath,[fileURLToPath(import.meta.url),'refused-tracked-child',root,mode],{windowsHide:true,timeout:40000,encoding:'utf8',maxBuffer:16384,stdio:['ignore','pipe','pipe']}));
  const calls=[],run=extra=>rollbackRefusedTrackedCandidate({...options,assertOwnerAuthority:async scope=>{calls.push(scope);assert.equal(scope.operation,'restore_task_changes');},...extra});
  return {root,options,calls,run};
}
function sign(file,key,payload){writeFileSync(file,JSON.stringify({payload,signature:createHmac('sha256',key).update(JSON.stringify(payload)+'\n').digest('hex')})+'\n');}
async function runStopped(x,extra={}) {
  // Fail closed on momentary Windows PID reuse; no weaker synthetic identity.
  for(let n=0;n<3;n++)try{return await x.run(extra);}catch(error){
    if(!error.stack?.includes('at gone ')||n===2)throw error;await new Promise(resolve=>setTimeout(resolve,500));
  }
}

test('real refused four-file Windows candidate is archived and restored by fixed Jobs, then normal native fences release',windows,async t=>{
  const x=fixture(t),o=x.options,review=readDurableNativeReview(o.directory),reviewBytes=readFileSync(path.join(o.directory,'review.json')),spentBytes=readFileSync(o.spentPath),writerBytes=readFileSync(path.join(o.state,'agent-host-writer.lock'));
  const failed=files.map(f=>readFileSync(path.join(o.repositoryPath,f))),unchanged=readFileSync(path.join(o.repositoryPath,'unchanged.txt'));
  const scope=inspectRefusedTrackedRollbackScope(o);assert.equal(scope.reviewDigest,review.digest);assert.equal(scope.changedScopeDigest,nativeDigest(review.payload.privateChanges));
  assert.equal(scope.writeScopeDigest,nativeDigest([...files].sort()));
  const before={root:o.repositoryPath,expected:{head:o.baselineCommit,branch:o.taskBranch,origin:o.origin}};
  assert.equal(qualifyNativeReconciliation(o.directory,undefined,before).eligible,false);
  const result=await runStopped(x);assert.equal(result.completed,true);assert.equal(result.archivedFileCount,4);assert.equal(result.restoredFileCount,4);
  assert.equal(result.writerLeaseRetained,true);assert.equal(result.executionAuthorized,false);assert.equal(result.releaseAllowed,false);
  assert.equal(git(o.repositoryPath,'status','--porcelain=v1'),'');assert.equal(git(o.repositoryPath,'branch','--show-current'),'main');
  assert.equal(git(o.repositoryPath,'for-each-ref','--format=%(refname)'), 'refs/heads/main');
  for(let i=0;i<files.length;i++){assert.deepEqual(readFileSync(path.join(o.directory,'refused-tracked-rollback-bytes',`${i}.bin`)),failed[i]);assert.equal(readFileSync(path.join(o.repositoryPath,files[i]),'utf8').includes('\r\n'),true);}
  assert.deepEqual(readFileSync(path.join(o.repositoryPath,'unchanged.txt')),unchanged);assert.deepEqual(readFileSync(path.join(o.state,'agent-host-writer.lock')),writerBytes);
  assert.deepEqual(readFileSync(path.join(o.directory,'review.json')),reviewBytes);assert.deepEqual(readFileSync(o.spentPath),spentBytes);
  assert.ok(x.calls.length>4);assert.equal((await x.run()).replay,true);
  const workspace={root:o.repositoryPath,expected:{head:o.baselineCommit,branch:o.baseBranch,origin:o.origin}};
  assert.equal(verifyRefusedTrackedRollbackDisposition(o.directory,workspace).completed,true);
  const journal=JSON.parse(readFileSync(path.join(o.directory,'refused-tracked-rollback.json'))).payload;
  assert.equal(journal.jobs.length,3);assert.deepEqual(journal.jobs.map(j=>j.operation),['restore','switch','delete_branch']);for(const j of journal.jobs){assert.equal(j.jobClosed,true);assert.equal(j.activeProcesses,0);assert.equal(j.rootExit,0);}
  const grant=issueNativeReconciliationApproval({directory:o.directory,workspace,assertOwnerAuthority(){}});assert.equal(reconcileNativeArtifacts(grant).completed,true);
  assert.equal(existsSync(path.join(o.state,'agent-host-writer.lock')),false);assert.equal(qualifyNativeReconciliation(o.directory,undefined,workspace).completed,true);
  assert.deepEqual(readFileSync(path.join(o.directory,'review.json')),reviewBytes);assert.deepEqual(readFileSync(o.spentPath),spentBytes);
  for(const forbidden of [o.repositoryPath,'source-a.txt','fixture@example.invalid',o.origin])assert.equal(JSON.stringify(result).includes(forbidden),false);
});

for(const stage of ['restore_intent','restore_effect','restored','switch_effect','delete_branch_effect','complete'])test(`durable ${stage} interruption observes actual state and retains fences until restored`,windows,async t=>{
  const x=fixture(t);let hit=false;
  await assert.rejects(runStopped(x,{onCheckpoint:async event=>{if(event===stage&&!hit){hit=true;throw Error('synthetic interruption');}}}),/synthetic interruption/);
  assert.equal(hit,true);assert.equal(existsSync(path.join(x.options.state,'agent-host-writer.lock')),true);
  const prior=JSON.parse(readFileSync(path.join(x.options.directory,'refused-tracked-rollback.json'))).payload,jobsBefore=prior.jobs.map(j=>j.job);
  const result=await runStopped(x);assert.equal(result.completed,true);
  const after=JSON.parse(readFileSync(path.join(x.options.directory,'refused-tracked-rollback.json'))).payload;
  assert.deepEqual(after.jobs.slice(0,jobsBefore.length).map(j=>j.job),jobsBefore);assert.equal(after.jobs.length,3);
  assert.equal(existsSync(path.join(x.options.state,'agent-host-recovery.lock')),false);
});

test('missing, forged, partial, wrong-scope disposition never admits native fence release',windows,async t=>{
  const x=fixture(t),o=x.options,workspace={root:o.repositoryPath,expected:{head:o.baselineCommit,branch:o.baseBranch,origin:o.origin}};
  assert.equal(qualifyNativeReconciliation(o.directory,undefined,workspace).eligible,false);await runStopped(x);
  const file=path.join(o.directory,'refused-tracked-rollback.json'),bytes=readFileSync(file),record=JSON.parse(bytes),key=readFileSync(path.join(o.directory,'integrity.key'));
  for(const mode of ['forged','partial','scope','jobs']) {
    const changed=structuredClone(record.payload);if(mode==='partial')changed.phase='restored';if(mode==='scope')changed.scope.reviewDigest='f'.repeat(64);if(mode==='jobs')changed.jobs=[];
    try{if(mode==='forged')writeFileSync(file,JSON.stringify({...record,signature:'0'.repeat(64)}));else sign(file,key,changed);
      assert.equal(qualifyNativeReconciliation(o.directory,undefined,workspace).eligible,false);assert.throws(()=>issueNativeReconciliationApproval({directory:o.directory,workspace,assertOwnerAuthority(){}}),/native_recovery/);
    }finally{writeFileSync(file,bytes);}
  }
  renameSync(file,file+'.held');try{assert.equal(qualifyNativeReconciliation(o.directory,undefined,workspace).eligible,false);}finally{renameSync(file+'.held',file);}
  const resume=path.join(o.directory,'resume-authorized.json');renameSync(resume,resume+'.held');
  try{assert.equal(qualifyNativeReconciliation(o.directory,undefined,workspace).eligible,false);}finally{renameSync(resume+'.held',resume);}
  const archive=path.join(o.directory,'refused-tracked-rollback-bytes','0.bin');writeFileSync(archive,'corrupt');assert.equal(qualifyNativeReconciliation(o.directory,undefined,workspace).eligible,false);
  assert.equal(existsSync(path.join(o.state,'agent-host-writer.lock')),true);
});

for(const mode of ['added','deleted','outside'])test(`untracked, deleted or out-of-scope ${mode} is retained without recovery effects`,windows,async t=>{
  const x=fixture(t,mode),snapshot=captureNativeFootprint(x.options.repositoryPath,{head:x.options.baselineCommit,branch:x.options.taskBranch,origin:x.options.origin});
  await assert.rejects(x.run(),/rollback_unproven/);assert.equal(captureNativeFootprint(x.options.repositoryPath,{head:x.options.baselineCommit,branch:x.options.taskBranch,origin:x.options.origin}).digest,snapshot.digest);
  assert.equal(existsSync(path.join(x.options.directory,'refused-tracked-rollback.json')),false);
});

test('source drift, wrong scope, branch/ref/config/filter, staged and hardlink changes are rejected before source effects',windows,async t=>{
  for(const mode of ['source','scope','ref','config','filter','attributes','staged','hardlink'])await t.test(mode,async t=>{
    const x=fixture(t),o=x.options,source=path.join(o.repositoryPath,files[0]),before=readFileSync(source),args={};
    if(mode==='source')writeFileSync(source,Buffer.concat([before,Buffer.from('foreign')]));
    if(mode==='scope')args.writePaths=[files[0]];
    if(mode==='ref')git(o.repositoryPath,'branch','foreign-ref');
    if(mode==='config')git(o.repositoryPath,'config','synthetic.foreign','true');
    if(mode==='filter')git(o.repositoryPath,'config','filter.external.clean','echo forbidden');
    if(mode==='attributes')writeFileSync(path.join(o.repositoryPath,'.gitattributes'),'*.txt filter=external\n');
    if(mode==='staged')git(o.repositoryPath,'add','--',files[0]);
    if(mode==='hardlink')linkSync(source,path.join(o.repositoryPath,'linked.txt'));
    const bytes=readFileSync(source);
    try{await assert.rejects(x.run(args),/native_|rollback_unproven/);assert.deepEqual(readFileSync(source),bytes);
      assert.equal(existsSync(path.join(o.directory,'refused-tracked-rollback.json')),false);
    }finally{if(mode==='hardlink')unlinkSync(path.join(o.repositoryPath,'linked.txt'));}
  });
});

test('an already configured filter in the sealed original repository is denied without invoking it',windows,async t=>{
  const x=fixture(t,'pre-filter');await assert.rejects(x.run(),/rollback_unproven/);
  assert.equal(existsSync(path.join(x.options.directory,'refused-tracked-rollback.json')),false);
  assert.equal(readFileSync(path.join(x.options.repositoryPath,files[0]),'utf8').includes('refused candidate'),true);
});

test('historical JSON field order joins only through the shared five-field identity bridge',windows,async t=>{
  const x=fixture(t,'json-order'),scope=inspectRefusedTrackedRollbackScope(x.options);
  const binding=readDurableNativeReview(x.options.directory).payload.binding;
  assert.equal(scope.executionId,binding.identity.executionId);assert.notEqual(binding.spent.record.attemptDigest,nativeDigest(binding.identity));
  const result=await runStopped(x);assert.equal(result.completed,true);
  const workspace={root:x.options.repositoryPath,expected:{head:x.options.baselineCommit,branch:x.options.baseBranch,origin:x.options.origin}};
  assert.equal(qualifyNativeReconciliation(x.options.directory,undefined,workspace).eligible,true);
});

test('revoked authority and foreign post-intent change retain archive, Writer and recovery barrier',windows,async t=>{
  const x=fixture(t);let accepted=true;
  await assert.rejects(runStopped(x,{assertOwnerAuthority:async()=>{if(!accepted)throw Error('owner authority revoked');},onCheckpoint:async stage=>{if(stage==='restore_intent')accepted=false;}}),/owner authority revoked/);
  assert.equal(existsSync(path.join(x.options.state,'agent-host-writer.lock')),true);assert.equal(existsSync(path.join(x.options.state,'agent-host-recovery.lock')),true);
  writeFileSync(path.join(x.options.repositoryPath,'foreign.txt'),'foreign');await assert.rejects(x.run(),/rollback_unproven/);
  assert.equal(readFileSync(path.join(x.options.repositoryPath,files[0]),'utf8').includes('refused candidate'),true);
});

test('lost closed-Job receipt remains blocked and is never retried from PID absence alone',windows,async t=>{
  const x=fixture(t);await assert.rejects(runStopped(x,{onCheckpoint:async stage=>{if(stage==='restore_intent')throw Error('pause');}}),/pause/);
  const file=path.join(x.options.directory,'refused-tracked-rollback.json'),record=JSON.parse(readFileSync(file)).payload,key=readFileSync(path.join(x.options.directory,'integrity.key'));
  record.pendingJob={operation:'restore',job:randomUUID()};sign(file,key,record);
  const before=captureNativeFootprint(x.options.repositoryPath,{head:x.options.baselineCommit,branch:x.options.taskBranch,origin:x.options.origin});
  await assert.rejects(x.run(),/rollback_unproven/);assert.equal(captureNativeFootprint(x.options.repositoryPath,{head:x.options.baselineCommit,branch:x.options.taskBranch,origin:x.options.origin}).digest,before.digest);
  assert.equal(existsSync(path.join(x.options.state,'agent-host-writer.lock')),true);
});
}
