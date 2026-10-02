// Fixed Worker recovery only. This module never launches a model, grants write
// authority, accepts a candidate, commits, pushes, or releases Writer/lease.
import path from 'node:path';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, writeFileSync, mkdirSync, openSync, closeSync, fsyncSync, renameSync, unlinkSync, realpathSync, readdirSync } from 'node:fs';
import { captureNativeFootprint, nativeDigest, nativeRelative, physicalIdentity } from './agent-host-native-footprint.mjs';
import { readDurableNativeReview, nativeArtifactSnapshot } from './agent-host-native-review.mjs';
import { qualifyNativeReconciliation } from './agent-host-native-reconciliation.mjs';
import { currentNativeProcessIdentity, observeWindowsProcessIdentity } from './agent-host-process-identity.mjs';
import { recoveryLockFilename } from './agent-host-writer-lock.mjs';
import { buildWindowsJobLauncher, startWindowsJob, isWindowsJobCleanupReceipt } from './agent-host-windows-job.mjs';

const hash = /^[a-f0-9]{64}$/, sha = /^[a-f0-9]{40}$/, encode = v => Buffer.from(JSON.stringify(v) + '\n');
const fail = () => { throw Object.assign(Error('failed_candidate_rollback_unproven'), { retryable: false, protocolAdmission: true }); };
const digest = b => createHash('sha256').update(b).digest('hex');
const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const environment = () => ({ PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP,
  GIT_OPTIONAL_LOCKS: '0', GIT_NO_REPLACE_OBJECTS: '1', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null', GIT_TERMINAL_PROMPT: '0' });
const gitArgs = args => ['--literal-pathspecs','-c','core.fsmonitor=false','-c','core.untrackedCache=false','-c','core.hooksPath=NUL',...args];
function git(root,args) {
  try { return execFileSync('git',gitArgs(args),{cwd:root,env:environment(),windowsHide:true,shell:false,timeout:10000,maxBuffer:2097152,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim(); }
  catch { fail(); }
}
function stableBytes(file, expected) {
  physicalIdentity(file,false); const a=lstatSync(file,{bigint:true});
  if(a.size>8n*1024n*1024n)fail();
  const bytes=readFileSync(file),b=lstatSync(file,{bigint:true});
  if(a.dev!==b.dev||a.ino!==b.ino||a.mtimeNs!==b.mtimeNs||a.size!==b.size||b.nlink!==1n||BigInt(bytes.length)!==a.size)fail();
  if(expected && (`${a.dev}:${a.ino}`!==expected.identity||String(a.size)!==expected.bytes||String(a.mtimeNs)!==expected.time||digest(bytes)!==expected.digest))fail();
  return bytes;
}
function atomic(file,bytes) {
  const next=file+'.next',fd=openSync(next,'wx',0o600);
  try { writeFileSync(fd,bytes);fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(next,file);if(!readFileSync(file).equals(bytes))fail();
}
const signed = (key,payload) => encode({payload,signature:createHmac('sha256',key).update(encode(payload)).digest('hex')});
function readSigned(file,key) {
  const {record:{payload,signature}}=nativeArtifactSnapshot(file);
  if(!hash.test(signature??'')||signature!==createHmac('sha256',key).update(encode(payload)).digest('hex'))fail();
  return payload;
}
function exactArtifact(state,binding) {
  if(path.basename(binding.name)!==binding.name)fail();
  const now=nativeArtifactSnapshot(path.join(state,binding.name));
  if(now.identity!==binding.identity||now.digest!==binding.digest)fail();
}
function unchangedInventory(now,original,removed) {
  const rows=original.inventory.rows.filter(r=>!removed.includes(r.path));
  if(!equal(now.inventory,{...original.inventory,rows})||now.rootIdentity!==original.rootIdentity||now.gitIdentity!==original.gitIdentity
    ||now.head!==original.head||now.originDigest!==original.originDigest)fail();
}
function reducedFootprint(original,removed) {
  const {digest:unused,...value}=original;
  const v={...value,dirty:value.dirty.filter(r=>!removed.includes(r.path)),inventory:{...value.inventory,rows:value.inventory.rows.filter(r=>!removed.includes(r.path))}};
  return {...v,digest:nativeDigest(v)};
}
function protectedGitMetadata(root,taskBranch) {
  const rows=[],allowed=new Set(['HEAD','index','logs/HEAD','packed-refs',`refs/heads/${taskBranch}`,`logs/refs/heads/${taskBranch}`]);
  function walk(directory,relative,depth) {
    if(depth>24)fail();
    for(const name of readdirSync(directory).sort()) {
      const rel=relative?`${relative}/${name}`:name,file=path.join(directory,name),s=lstatSync(file,{bigint:true});
      if(s.isSymbolicLink()||(!s.isDirectory()&&!s.isFile())||rows.length>8192)fail();
      if(allowed.has(rel))continue;
      if(s.isDirectory()) {rows.push({path:rel,identity:`${s.dev}:${s.ino}`,kind:'directory'});walk(file,rel,depth+1);}
      else {if(s.nlink!==1n)fail();rows.push({path:rel,identity:`${s.dev}:${s.ino}`,bytes:String(s.size),time:String(s.mtimeNs),
        // Authority scripts/configuration are byte-pinned as well as metadata.
        ...(rel==='config'||rel.startsWith('hooks/')||rel.startsWith('info/')?{digest:digest(stableBytes(file))}:{})});}
    }
  }
  physicalIdentity(path.join(root,'.git'));walk(path.join(root,'.git'),'',0);return nativeDigest(rows);
}

/** The callback must verify the currently accepted Roost recovery decision,
 * exact task/application/installation/scope and separately recorded human consent.
 * The function retains all failed bytes and returns only bounded public evidence.
 * Root calls the existing signed native reconciler ONLY after completed=true.
 */
export async function rollbackFailedAddedCandidate({ directory, repositoryPath, baselineCommit, taskBranch, baseBranch, origin, writePaths,
  assertOwnerAuthority, onCheckpoint = () => {} }) {
  if(process.platform!=='win32'||typeof assertOwnerAuthority!=='function'||!sha.test(baselineCommit??'')
    ||!/^codex\/task-[a-f0-9-]{36}$/.test(taskBranch??'')||!/^[a-zA-Z0-9][a-zA-Z0-9_./-]{0,100}$/.test(baseBranch??'')
    ||baseBranch.includes('..')||baseBranch===taskBranch||!Array.isArray(writePaths)||!writePaths.length||writePaths.length>128
    ||typeof origin!=='string'||!/^https:\/\/[^\s@]+$/.test(origin))fail();
  writePaths=writePaths.map(nativeRelative);if(new Set(writePaths).size!==writePaths.length)fail();
  const review=readDurableNativeReview(directory),p=review.payload,b=p.binding,state=path.dirname(directory),stateIdentity=physicalIdentity(state);
  if(p.stage!=='final'||p.public?.verdict!=='acceptance_failed'||p.verification?.status!=='FAIL'||p.installation?.status!=='PASS'
    ||p.public.violations.length||p.public.scopeReviewRequired||p.public.categoryCounts.protected!==0||b.fixture
    ||p.verification.testUnchanged!==true||p.verification.baselineCommitUnchanged!==true||p.job?.rootExit!==0||p.job?.terminationReason!=='root_exit'
    ||physicalIdentity(repositoryPath)!==b.rootIdentity||!taskBranch.endsWith(b.identity.taskId))fail();
  const changes=p.privateChanges;
  if(!Array.isArray(changes)||!changes.length||changes.length>128||changes.some(r=>r.category!=='content'||!r.expected||r.change!=='added'||r.before!==null
    ||r.after?.kind!=='file'||r.gitStatusBefore!==null||r.gitStatusAfter!=='??'||!hash.test(r.after.digest??'')||r.pathDigest!==nativeDigest(r.path)
    ||!writePaths.some(w=>r.path===w||r.path?.startsWith(w+'/'))))fail();
  for(const r of changes)nativeRelative(r.path);
  const scope=Object.freeze({schemaVersion:'roost-failed-candidate-rollback-v1',operation:'restore_task_changes',...b.identity,
    reviewDigest:review.digest,rootIdentity:b.rootIdentity,baselineCommit,taskBranchDigest:nativeDigest(taskBranch),baseBranchDigest:nativeDigest(baseBranch),
    originDigest:nativeDigest(origin),writeScopeDigest:nativeDigest(writePaths),changedScopeDigest:nativeDigest(changes)});
  await assertOwnerAuthority(scope);
  const journalFile=path.join(directory,'failed-candidate-rollback.json'),controllerFile=path.join(directory,'.failed-candidate-rollback-controller.json');
  const archive=path.join(directory,'failed-candidate-rollback-bytes'),key=readFileSync(path.join(directory,'integrity.key'));
  let record=existsSync(journalFile)?readSigned(journalFile,key):null;
  if(record && (record.version!==1||!equal(record.scope,scope)||record.reviewIdentity!==review.identity||record.directoryIdentity!==review.directoryIdentity
    ||record.stateIdentity!==stateIdentity||!['archive_intent','archived','remove_intent','removed','switch_intent','switched','delete_branch_intent','branch_deleted','complete'].includes(record.phase)))fail();
  if(record?.phase==='complete') {
    if(existsSync(controllerFile)) {
      const active=readSigned(controllerFile,key);
      if(active.reviewDigest!==review.digest||observeWindowsProcessIdentity(active.owner.pid))fail();
    }
    assertClean(record);await assertOwnerAuthority(scope);
    for(let i=0;i<changes.length;i++)if(physicalIdentity(path.join(archive,`${i}.bin`),false)!==record.archived[i]?.identity
      ||digest(stableBytes(path.join(archive,`${i}.bin`)))!==changes[i].after.digest)fail();
    const barrier=path.join(state,recoveryLockFilename);
    if(existsSync(barrier)) {
      if(!qualifyNativeReconciliation(directory).eligible||nativeArtifactSnapshot(barrier).digest!==record.barrier?.digest)fail();
      unlinkSync(barrier);
    }
    return receipt(record,true);
  }
  // The durable review withholds the checkpoint body, but signs the complete
  // Writer file digest and physical identity. Read it only through that binding.
  const writerSnapshot=nativeArtifactSnapshot(path.join(state,b.writer.name));
  if(writerSnapshot.digest!==b.writer.digest||writerSnapshot.identity!==b.writer.identity)fail();
  const c=writerSnapshot.record.checkpoint;
  if(c?.executionId!==b.identity.executionId||c.workspaceId!==b.identity.workspaceId||c.attempt!==b.identity.attempt||c.sessionId!==b.writer.record.ownerNonce
    ||c.taskId!==b.identity.taskId||c.applicationId!==b.identity.applicationId
    ||c.stage!=='spawn_intent'||c.headCommit!==baselineCommit||c.branch!==taskBranch||record?.pendingJob)fail();
  const q=qualifyNativeReconciliation(directory);if(!q.eligible||q.reviewDigest!==review.digest)fail();
  if(existsSync(controllerFile)) {
    const old=readSigned(controllerFile,key);
    if(old.reviewDigest!==review.digest||old.self!==physicalIdentity(controllerFile,false)||observeWindowsProcessIdentity(old.owner.pid))fail();
    unlinkSync(controllerFile);
  }
  const fd=openSync(controllerFile,'wx',0o600);
  try { writeFileSync(fd,signed(key,{reviewDigest:review.digest,owner:currentNativeProcessIdentity(),self:physicalIdentity(controllerFile,false)}));fsyncSync(fd); }
  finally { closeSync(fd); }
  const controller=nativeArtifactSnapshot(controllerFile);
  const barrierPath=path.join(state,recoveryLockFilename);
  try {
    if(!record) {
      if(existsSync(barrierPath)||existsSync(archive))fail();
      const original=captureNativeFootprint(repositoryPath,{head:baselineCommit,branch:taskBranch,origin});
      if(original.digest!==p.postFootprintDigest||original.dirty.length!==changes.length||original.dirty.some(r=>r.status!=='??'||!changes.some(v=>v.path===r.path&&v.after.digest===r.digest)))fail();
      if(git(repositoryPath,['rev-parse',`refs/heads/${baseBranch}`])!==baselineCommit||git(repositoryPath,['rev-parse',`refs/heads/${taskBranch}`])!==baselineCommit)fail();
      for(const r of changes) {
        stableBytes(path.join(repositoryPath,r.path),r.after);
        if(git(repositoryPath,['ls-tree','-r','--name-only',baselineCommit,'--',r.path]))fail();
      }
      record={version:1,scope,reviewIdentity:review.identity,directoryIdentity:review.directoryIdentity,stateIdentity,
        phase:'archive_intent',original,protectedGitDigest:protectedGitMetadata(repositoryPath,taskBranch),refs:git(repositoryPath,['for-each-ref','--format=%(refname) %(objectname)']),removed:0,pending:null,
        archived:[],jobs:[],pendingJob:null,archiveIdentity:null,barrier:null};
      // A signed intent precedes creation of both the private archive and barrier.
      persist();
    }
    if(!record.barrier) {
      if(existsSync(barrierPath)) {
        const old=readSigned(barrierPath,key);if(old.rollbackReview!==review.digest||old.scopeDigest!==nativeDigest(scope))fail();
      } else { const f=openSync(barrierPath,'wx',0o600);try{writeFileSync(f,signed(key,{rollbackReview:review.digest,scopeDigest:nativeDigest(scope)}));fsyncSync(f);}finally{closeSync(f);} }
      record.barrier=nativeArtifactSnapshot(barrierPath);persist();
    }
    if(!record.archiveIdentity) {
      if(!existsSync(archive))mkdirSync(archive);physicalIdentity(archive);record.archiveIdentity=physicalIdentity(archive);persist();
    }
    await check();
    // All archives are verified before the first application effect.
    for(let i=0;i<changes.length;i++) {
      const file=path.join(archive,`${i}.bin`),r=changes[i];
      if(!record.archived[i]) {
        if(record.phase!=='archive_intent')fail();
        const bytes=stableBytes(path.join(repositoryPath,r.path),r.after);
        if(!existsSync(file)) { const f=openSync(file,'wx',0o600);try{writeFileSync(f,bytes);fsyncSync(f);}finally{closeSync(f);} }
        if(!stableBytes(file).equals(bytes))fail();
        record.archived[i]={identity:physicalIdentity(file,false),digest:r.after.digest};persist();
      }
      if(physicalIdentity(file,false)!==record.archived[i].identity||digest(stableBytes(file))!==r.after.digest)fail();
    }
    if(record.phase==='archive_intent'){record.phase='archived';persist();await onCheckpoint('archived');}
    while(record.removed<changes.length) {
      await check();const i=record.removed,r=changes[i],file=path.join(repositoryPath,r.path);
      if(record.phase==='remove_intent'&&record.pending===i&&!existsSync(file)) {
        assertRemainder(i+1);record.removed++;record.pending=null;record.phase='removed';persist();continue;
      }
      assertRemainder(i);stableBytes(file,r.after);
      record.phase='remove_intent';record.pending=i;persist();await onCheckpoint('remove_intent');await check();
      assertRemainder(i);stableBytes(file,r.after);unlinkSync(file);await onCheckpoint('file_removed');
      assertRemainder(i+1);record.removed++;record.pending=null;record.phase='removed';persist();
    }
    const runtime=path.join(directory,`rollback-job-${randomUUID()}`);mkdirSync(runtime);
    const launcher=await buildWindowsJobLauncher(runtime);
    const exe=realpathSync.native(execFileSync('where.exe',['git.exe'],{env:environment(),windowsHide:true,encoding:'utf8',timeout:5000,maxBuffer:32768}).trim().split(/\r?\n/)[0]);
    const exeHash=digest(readFileSync(exe));
    const mutate=async args=>{
      await check();if(digest(readFileSync(exe))!==exeHash)fail();
      const expectedBranch=record.phase==='switch_intent'?taskBranch:record.phase==='delete_branch_intent'?baseBranch:null;
      if(!expectedBranch)fail();assertContent(record,expectedBranch,false);
      const job=await (await startWindowsJob(launcher,{executable:exe,argv:gitArgs(args),cwd:repositoryPath,environment:environment(),input:'',durationMs:15000,attempt:b.identity.executionId,
        confirmResume:event=>{record.pendingJob={job:event.job,rootPid:event.rootPid,rootCreationTime:event.rootCreationTime,
          launcherPid:event.launcherPid,launcherCreationTime:event.launcherCreationTime,executableDigest:event.executableDigest,
          launcherSha256:event.launcherSha256,sourceSha256:event.sourceSha256};persist();return nativeDigest(record.pendingJob);}})).completion;
      if(!isWindowsJobCleanupReceipt(job)||job.rootExit!==0||job.jobClosed!==true||job.terminationReason!=='root_exit')fail();
      record.jobs.push(structuredClone(job));record.pendingJob=null;persist();
    };
    if(!['switched','delete_branch_intent','branch_deleted'].includes(record.phase)) {
      const branch=git(repositoryPath,['symbolic-ref','--short','HEAD']);
      if(branch!==taskBranch && !(record.phase==='switch_intent'&&branch===baseBranch))fail();
      assertContent(record,branch,false);
      if(branch===taskBranch) { record.phase='switch_intent';persist();await onCheckpoint('switch_intent');await mutate(['switch','--no-guess',baseBranch]);await onCheckpoint('branch_switched'); }
      assertContent(record,baseBranch,false);record.phase='switched';persist();
    }
    if(record.phase!=='branch_deleted') {
      const refs=git(repositoryPath,['for-each-ref','--format=%(refname) %(objectname)']);
      if(refs===record.refs) {
        assertContent(record,baseBranch,false);record.phase='delete_branch_intent';persist();await onCheckpoint('delete_branch_intent');
        await mutate(['update-ref','-d',`refs/heads/${taskBranch}`,baselineCommit]);await onCheckpoint('branch_deleted');
      } else if(record.phase!=='delete_branch_intent')fail();
      assertClean(record);record.phase='branch_deleted';persist();
    }
    await check();assertClean(record);record.phase='complete';persist();await onCheckpoint('complete');
    if(nativeArtifactSnapshot(barrierPath).digest!==record.barrier.digest)fail();unlinkSync(barrierPath);
    return receipt(record,false);
  } finally {
    if(existsSync(controllerFile)&&nativeArtifactSnapshot(controllerFile).digest===controller.digest)unlinkSync(controllerFile);
    // Every unsuccessful application operation retains the durable barrier and
    // exact original Writer/lease. Never release ownership because of an error.
  }
  function persist(){atomic(journalFile,signed(key,record));}
  async function check(){
    await assertOwnerAuthority(scope);
    if(physicalIdentity(state)!==stateIdentity||physicalIdentity(directory)!==review.directoryIdentity||physicalIdentity(repositoryPath)!==b.rootIdentity
      ||physicalIdentity(archive)!==record.archiveIdentity||readDurableNativeReview(directory).digest!==review.digest
      ||nativeArtifactSnapshot(controllerFile).digest!==controller.digest||nativeArtifactSnapshot(barrierPath).digest!==record.barrier.digest
      ||!equal(readSigned(journalFile,key),record))fail();
    for(const artifact of [b.writer,b.lease,b.spent])exactArtifact(state,artifact);
    for(const identity of [b.writer.record.ownerProcess,{pid:p.job.rootPid,creationTime:p.job.rootCreationTime},{pid:p.job.launcherPid,creationTime:p.job.launcherCreationTime}])
      if(observeWindowsProcessIdentity(identity.pid))fail();
  }
  function assertRemainder(count){
    const expected=reducedFootprint(record.original,changes.slice(0,count).map(r=>r.path));
    if(captureNativeFootprint(repositoryPath,{head:baselineCommit,branch:taskBranch,origin}).digest!==expected.digest)fail();
  }
  function assertContent(r,branch,deleted){
    const now=captureNativeFootprint(repositoryPath,{head:baselineCommit,branch,origin});
    unchangedInventory(now,r.original,changes.map(v=>v.path));if(now.dirty.length||protectedGitMetadata(repositoryPath,taskBranch)!==r.protectedGitDigest)fail();
    const refs=r.refs.split('\n').filter(line=>!deleted||!line.startsWith(`refs/heads/${taskBranch} `)).join('\n');
    if(git(repositoryPath,['for-each-ref','--format=%(refname) %(objectname)'])!==refs||git(repositoryPath,['rev-parse',`refs/heads/${baseBranch}`])!==baselineCommit)fail();
  }
  function assertClean(r){assertContent(r,baseBranch,true);for(const v of changes)if(existsSync(path.join(repositoryPath,v.path)))fail();}
  function receipt(r,replay){return Object.freeze({schemaVersion:scope.schemaVersion,completed:true,replay,executionId:b.identity.executionId,
    reviewDigest:review.digest,journalDigest:nativeArtifactSnapshot(journalFile).digest,archivedFileCount:changes.length,removedFileCount:r.removed,
    cleanBaseline:true,taskBranchRemoved:true,writerLeaseRetained:true,modelsInvoked:false,remoteEffects:false});}
}
