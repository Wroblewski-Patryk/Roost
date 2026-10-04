// Fixed Worker recovery of a closed, scoped, uncommitted refused candidate.
// No model, candidate acceptance, new dispatch, commit, push or lease release.
import path from 'node:path';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, writeFileSync, mkdirSync, openSync, closeSync, fsyncSync, renameSync, unlinkSync, realpathSync, readdirSync } from 'node:fs';
import { captureNativeFootprint, nativeDigest, nativeRelative, physicalIdentity, nativeFootprintPolicy } from './agent-host-native-footprint.mjs';
import { readDurableNativeReview, nativeArtifactSnapshot } from './agent-host-native-review.mjs';
import { readFixtureEvidence } from './agent-host-fixture-ownership.mjs';
import { currentNativeProcessIdentity, observeWindowsProcessIdentity } from './agent-host-process-identity.mjs';
import { recoveryLockFilename, writerLockFilename } from './agent-host-writer-lock.mjs';
import { bridgeRecoveryIdentity, legacyInputIdentityVersion } from './agent-host-recovery-identity.mjs';
import { buildWindowsJobLauncher, startWindowsJob, isWindowsJobCleanupReceipt } from './agent-host-windows-job.mjs';

const hash = /^[a-f0-9]{64}$/, sha = /^[a-f0-9]{40}$/, uuid = /^[a-f0-9-]{36}$/i;
const encode = value => Buffer.from(JSON.stringify(value) + '\n'), equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = () => { throw Object.assign(Error('refused_tracked_rollback_unproven'), { retryable:false, protocolAdmission:true }); };
const journalName = 'refused-tracked-rollback.json', archiveName = 'refused-tracked-rollback-bytes';
const environment = () => ({ PATH:process.env.PATH, SystemRoot:process.env.SystemRoot, TEMP:process.env.TEMP, TMP:process.env.TMP,
  GIT_OPTIONAL_LOCKS:'0', GIT_NO_REPLACE_OBJECTS:'1', GIT_CONFIG_NOSYSTEM:'1', GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null', GIT_TERMINAL_PROMPT:'0' });
const gitArgs = args => ['--literal-pathspecs','-c','core.fsmonitor=false','-c','core.untrackedCache=false','-c','core.hooksPath=NUL',...args];
function git(root,args,{binary=false,empty=false}={}) {
  try { const r=execFileSync('git',gitArgs(args),{cwd:root,env:environment(),windowsHide:true,shell:false,timeout:10000,maxBuffer:8388608,
    encoding:binary?undefined:'utf8',stdio:['ignore','pipe','pipe']});return binary?r:r.trim(); }
  catch(error) { if(empty && error.status===1 && !error.stdout?.length)return '';fail(); }
}
function stableBytes(file,expected) {
  physicalIdentity(file,false);const a=lstatSync(file,{bigint:true});if(a.size>8n*1024n*1024n)fail();
  const bytes=readFileSync(file),b=lstatSync(file,{bigint:true});
  if(a.dev!==b.dev||a.ino!==b.ino||a.mtimeNs!==b.mtimeNs||a.size!==b.size||b.nlink!==1n||BigInt(bytes.length)!==a.size)fail();
  if(expected && (`${a.dev}:${a.ino}`!==expected.identity||String(a.size)!==expected.bytes||String(a.mtimeNs)!==expected.time||digest(bytes)!==expected.digest))fail();
  return bytes;
}
function signed(key,payload) {return encode({payload,signature:createHmac('sha256',key).update(encode(payload)).digest('hex')});}
function readSigned(file,key) {
  const {record:{payload,signature}}=nativeArtifactSnapshot(file);
  if(!hash.test(signature??'')||!timingSafeEqual(Buffer.from(signature,'hex'),createHmac('sha256',key).update(encode(payload)).digest()))fail();return payload;
}
function atomic(file,bytes) {
  const pending=file+'.next',fd=openSync(pending,'wx',0o600);try{writeFileSync(fd,bytes);fsyncSync(fd);}finally{closeSync(fd);}
  renameSync(pending,file);if(!readFileSync(file).equals(bytes))fail();
}
function artifact(state,binding) {
  if(typeof binding?.name!=='string'||path.basename(binding.name)!==binding.name)fail();const now=nativeArtifactSnapshot(path.join(state,binding.name));
  if(now.identity!==binding.identity||now.digest!==binding.digest)fail();return now;
}
function gone(value) {
  if(!value||!Number.isSafeInteger(value.pid)||!/^\d{16,20}$/.test(value.creationTime??'')||observeWindowsProcessIdentity(value.pid))fail();
}
function stoppedJob(job,executionId) {
  if(!job||!['roost-windows-job-v1','roost-windows-job-v2'].includes(job.version)||job.attempt!==executionId||!uuid.test(job.job??'')
    ||job.rootExit!==0||job.terminationReason!=='root_exit'||job.cleanup!==true||job.activeProcesses!==0||job.jobClosed!==true
    ||job.assignedBeforeResume!==true||job.resumed!==true||job.killOnClose!==true||job.breakaway!==false
    ||![job.executableDigest,job.launcherSha256,job.sourceSha256].every(v=>hash.test(v??'')))fail();
  gone({pid:job.rootPid,creationTime:job.rootCreationTime});gone({pid:job.launcherPid,creationTime:job.launcherCreationTime});
}
function originalReview(directory) {
  const review=readDurableNativeReview(directory),p=review.payload,b=p.binding,pub=p.public;
  if(p.policy!==nativeFootprintPolicy||p.stage!=='final'||b?.fixture||!b?.identity||b.identity.attempt!==1
    ||!['executionId','workspaceId','taskId','applicationId'].every(k=>uuid.test(b.identity[k]??''))
    ||!hash.test(b.rootIdentity??'')||!hash.test(b.ready??'')||!hash.test(b.preFootprintDigest??'')
    ||p.verification?.status!=='REFUSED'||p.verification.reason!=='coding_tests_unproven'
    ||pub?.verdict!=='verification_blocked'||pub.verification!=='REFUSED'||pub.installation!=='PASS'
    ||p.installation?.status!=='PASS'||!hash.test(p.installation.manifestDigest??'')
    ||!Array.isArray(pub.violations)||pub.violations.length||pub.scopeReviewRequired!==false||pub.refusalCode!==null
    ||pub.categoryCounts?.protected!==0||pub.releaseAllowed!==false||pub.bindingDigest!==nativeDigest(b)
    ||pub.preFootprintDigest!==b.preFootprintDigest||pub.postFootprintDigest!==p.postFootprintDigest
    ||!hash.test(p.postFootprintDigest??'')||p.postFootprintDigest===b.preFootprintDigest||pub.jobDigest!==nativeDigest(p.job)
    ||!Array.isArray(p.privateChanges)||!p.privateChanges.length||p.privateChanges.length>128
    ||pub.categoryCounts?.content!==p.privateChanges.length||!Array.isArray(pub.changedPathIds)||pub.changedPathIds.length!==p.privateChanges.length)fail();
  for(const r of p.privateChanges) {
    nativeRelative(r.path);
    if(r.pathDigest!==nativeDigest(r.path)||r.category!=='content'||r.expected!==true||r.change!=='modified'
      ||r.gitStatusBefore!==null||r.gitStatusAfter!==' M'||r.before?.kind!=='file'||r.after?.kind!=='file'
      ||r.before.digest!==null||!hash.test(r.after.digest??'')||!/^[0-9]+:[0-9]+$/.test(r.before.identity??'')
      ||!/^[0-9]+:[0-9]+$/.test(r.after.identity??'')||!/^\d+$/.test(r.before.bytes??'')||!/^\d+$/.test(r.before.time??''))fail();
  }
  const integrityKey=readFileSync(path.join(directory,'integrity.key'));
  if(!equal(pub.changedPathIds,p.privateChanges.map(r=>createHmac('sha256',integrityKey).update(r.pathDigest).digest('hex'))))fail();
  if(new Set(p.privateChanges.map(r=>r.path)).size!==p.privateChanges.length||b.writer?.name!==writerLockFilename
    ||b.lease?.name!==`application-${nativeDigest(b.identity.applicationId)}.lease`
    ||b.lease.record?.attempt!==b.identity.executionId||b.lease.record?.application!==nativeDigest(b.identity.applicationId)
    ||b.lease.record?.writer!==b.writer.record?.ownerNonce||b.spent?.record?.state!=='dispatch_reserved'
    ||b.writer.record.ownerProcess?.pid!==b.writer.record.ownerPid)fail();
  bridgeRecoveryIdentity(b.identity,b.spent.record.attemptDigest,
    b.spent.record.scope==='one_real_hermes_coding_smoke_b21_only'?legacyInputIdentityVersion:undefined);
  stoppedJob(p.job,b.identity.executionId);if(p.job.version!=='roost-windows-job-v2'||!p.readyResume||!p.resume)fail();
  const ready=readFixtureEvidence(directory,'fixture-ready.json'),resume=readFixtureEvidence(directory,'resume-authorized.json'),r=ready.payload,s=resume.payload;
  if(ready.identity!==p.readyResume.identity||ready.digest!==p.readyResume.digest||resume.identity!==p.resume.identity||resume.digest!==p.resume.digest
    ||p.job.resumeReceipt!==resume.digest||r.version!=='roost-native-ready-origin-v1'||s.version!=='roost-native-resume-v1'
    ||r.bindingDigest!==nativeDigest(b)||s.bindingDigest!==nativeDigest(b)||s.readyDigest!==ready.digest
    ||!hash.test(r.authorityDigest??'')||s.authorityDigest!==r.authorityDigest||r.executionRestorable!==false||s.executionRestorable!==false
    ||nativeDigest(r.runtime)!==nativeDigest(s.runtime)||!Number.isFinite(Date.parse(r.at))||!Number.isFinite(Date.parse(s.at))
    ||Date.parse(s.at)<Date.parse(r.at)||!Number.isFinite(Date.parse(r.runtime?.deadline))||Date.parse(s.at)>=Date.parse(r.runtime.deadline)
    ||r.runtime?.executable?.digest!==p.job.executableDigest||r.runtime?.launcher?.digest!==p.job.launcherSha256
    ||['job','rootPid','rootCreationTime','launcherPid','launcherCreationTime','executableDigest','launcherSha256','sourceSha256'].some(k=>s.assignment?.[k]!==p.job[k]))fail();
  gone(b.writer.record.ownerProcess);artifact(path.dirname(directory),b.spent);return review;
}
function optionsScope(options,review) {
  const {repositoryPath,baselineCommit,taskBranch,baseBranch,origin}=options,writePaths=options.writePaths?.map(nativeRelative),b=review.payload.binding;
  if(process.platform!=='win32'||!sha.test(baselineCommit??'')||taskBranch!==`codex/task-${b.identity.taskId}`
    ||typeof baseBranch!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_./-]{0,100}$/.test(baseBranch)||baseBranch.includes('..')||baseBranch===taskBranch
    ||typeof origin!=='string'||!/^https:\/\/[^\s@]+$/.test(origin)||!Array.isArray(writePaths)||!writePaths.length||writePaths.length>128
    ||new Set(writePaths).size!==writePaths.length||physicalIdentity(repositoryPath)!==b.rootIdentity
    ||review.payload.privateChanges.some(r=>!writePaths.some(w=>r.path===w||r.path.startsWith(w+'/'))))fail();
  return Object.freeze({schemaVersion:'roost-refused-tracked-rollback-v1',operation:'restore_task_changes',...b.identity,reviewDigest:review.digest,
    rootIdentity:b.rootIdentity,baselineCommit,taskBranchDigest:nativeDigest(taskBranch),baseBranchDigest:nativeDigest(baseBranch),
    originDigest:nativeDigest(origin),writeScopeDigest:nativeDigest([...writePaths].sort()),changedScopeDigest:nativeDigest(review.payload.privateChanges)});
}
export function inspectRefusedTrackedRollbackScope(options) {
  const review=originalReview(options.directory),scope=optionsScope(options,review);const state=path.dirname(options.directory),b=review.payload.binding;
  artifact(state,b.writer);artifact(state,b.lease);
  const checkpoint=nativeArtifactSnapshot(path.join(state,b.writer.name)).record.checkpoint;
  if(checkpoint?.executionId!==b.identity.executionId||checkpoint.workspaceId!==b.identity.workspaceId||checkpoint.taskId!==b.identity.taskId
    ||checkpoint.applicationId!==b.identity.applicationId||checkpoint.attempt!==1||checkpoint.sessionId!==b.writer.record.ownerNonce
    ||checkpoint.stage!=='spawn_intent'||checkpoint.branch!==options.taskBranch||checkpoint.headCommit!==options.baselineCommit)fail();
  return scope;
}
function protectedGit(root,taskBranch) {
  const rows=[],allowed=new Set(['HEAD','index','logs/HEAD','packed-refs',`refs/heads/${taskBranch}`,`logs/refs/heads/${taskBranch}`]);
  // Git may prune only the empty namespace directory of the removed task ref.
  // Still traverse it so every other ref/log remains protected.
  const taskParents=new Set(['refs/heads/codex','logs/refs/heads/codex']);
  function walk(dir,relative,depth) {
    if(depth>24)fail();for(const name of readdirSync(dir).sort()) {
      const rel=relative?`${relative}/${name}`:name,file=path.join(dir,name),s=lstatSync(file,{bigint:true});
      if(s.isSymbolicLink()||!s.isDirectory()&&!s.isFile()||rows.length>32768)fail();if(allowed.has(rel))continue;
      if(s.isDirectory()){if(!taskParents.has(rel))rows.push({path:rel,identity:`${s.dev}:${s.ino}`,kind:'directory'});walk(file,rel,depth+1);}
      else{if(s.nlink!==1n)fail();rows.push({path:rel,identity:`${s.dev}:${s.ino}`,bytes:String(s.size),time:String(s.mtimeNs),
        ...(rel==='config'||rel.startsWith('hooks/')||rel.startsWith('info/')?{digest:digest(stableBytes(file))}:{})});}
    }
  }
  physicalIdentity(path.join(root,'.git'));walk(path.join(root,'.git'),'',0);return nativeDigest(rows);
}
function restoreBasis(root,baseline,changes) {
  // No external attribute/filter/config execution may accompany fixed restore.
  if(git(root,['config','--local','--name-only','--get-regexp','^(filter\\.|include\\.|includeif\\.|core\\.attributesfile|core\\.worktree|extensions\\.)'],{empty:true}))fail();
  const attributes=git(root,['check-attr','--all','--',...changes.map(r=>r.path)]),map=new Map();
  for(const line of attributes.split('\n').filter(Boolean)) {
    const match=/^(.+): ([^: ]+): (.+)$/.exec(line);if(!match||!changes.some(r=>r.path===match[1])||!['text','eol'].includes(match[2]))fail();
    if(match[2]==='text'&&!['set','unset','auto'].includes(match[3])||match[2]==='eol'&&!['lf','crlf'].includes(match[3]))fail();
    if(!map.has(match[1]))map.set(match[1],{});map.get(match[1])[match[2]]=match[3];
  }
  const auto=git(root,['config','--get','core.autocrlf'],{empty:true}),eol=git(root,['config','--get','core.eol'],{empty:true});
  if(!['','true','false','input'].includes(auto)||!['','native','lf','crlf'].includes(eol))fail();
  return changes.map(r=>{
    const tree=git(root,['ls-tree','--full-tree',baseline,'--',r.path]);const m=/^100644 blob ([a-f0-9]{40})\t(.+)$/.exec(tree);
    if(!m||m[2]!==r.path)fail();const bytes=git(root,['cat-file','blob',m[1]],{binary:true});
    if(bytes.length>8388608||bytes.includes(0)||!Buffer.from(bytes.toString('utf8'),'utf8').equals(bytes)
      ||createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex')!==m[1])fail();
    const attr=map.get(r.path)??{},text=attr.text!=='unset'&&(attr.text==='set'||attr.text==='auto'||attr.eol||auto==='true'||auto==='input');
    const crlf=text&&(attr.eol==='crlf'||!attr.eol&&(auto==='true'||auto!=='input'&&eol!=='lf'&&(eol==='crlf'||process.platform==='win32')));
    const working=crlf?Buffer.from(bytes.toString('utf8').replace(/\r?\n/g,'\r\n'),'utf8'):bytes;
    if(String(working.length)!==r.before.bytes)fail();return {path:r.path,blob:m[1],bytes:String(working.length),digest:digest(working)};
  });
}
function invariant(root,record,review,{branch,deleted=false,allowRestored=false}={}) {
  const {baselineCommit,taskBranch,baseBranch,origin}=record.parameters,changes=review.payload.privateChanges;
  const now=captureNativeFootprint(root,{head:baselineCommit,branch,origin});
  if(now.rootIdentity!==record.original.rootIdentity||now.gitIdentity!==record.original.gitIdentity||now.head!==record.original.head
    ||now.originDigest!==record.original.originDigest||!equal(now.inventory.skipped,record.original.inventory.skipped)
    ||!equal(now.inventory.rows.filter(r=>!changes.some(c=>c.path===r.path)),record.original.inventory.rows.filter(r=>!changes.some(c=>c.path===r.path)))
    ||protectedGit(root,taskBranch)!==record.protectedGitDigest||nativeDigest(git(root,['ls-files','--stage','-z']))!==record.indexEntriesDigest
    ||git(root,['diff','--cached','--name-only',baselineCommit,'--'])||!equal(restoreBasis(root,baselineCommit,changes),record.baselineFiles))fail();
  const refs=record.refs.split('\n').filter(line=>!deleted||!line.startsWith(`refs/heads/${taskBranch} `)).join('\n');
  if(git(root,['for-each-ref','--format=%(refname) %(objectname)'])!==refs||git(root,['rev-parse',`refs/heads/${baseBranch}`])!==baselineCommit)fail();
  for(const r of changes) {
    const row=now.inventory.rows.find(v=>v.path===r.path),dirty=now.dirty.find(v=>v.path===r.path),base=record.baselineFiles.find(v=>v.path===r.path);
    if(!row||row.kind!=='file'||row.links!=='1')fail();const bytes=stableBytes(path.join(root,r.path));
    const restored=digest(bytes)===base.digest&&String(bytes.length)===base.bytes&&!dirty;
    const original=equal(row,record.original.inventory.rows.find(v=>v.path===r.path))&&dirty?.status===' M'&&dirty.digest===r.after.digest;
    if(allowRestored?!restored&&!original:!restored)fail();
  }
  if(now.dirty.some(r=>!changes.some(c=>c.path===r.path))||!allowRestored&&now.dirty.length)fail();return now;
}
function verifyRecord(directory,record,review) {
  const p=review.payload,b=p.binding,key=readFileSync(path.join(directory,'integrity.key')),state=path.dirname(directory);
  if(record?.version!==1||record.phase!=='complete'||record.reviewIdentity!==review.identity||record.directoryIdentity!==review.directoryIdentity
    ||record.stateIdentity!==physicalIdentity(state)||!equal(record.scope,optionsScope({...record.parameters,directory},review))
    ||!Array.isArray(record.jobs)||record.jobs.length<2||record.pendingJob!==null||record.archiveIdentity!==physicalIdentity(path.join(directory,archiveName)))fail();
  for(const job of record.jobs)stoppedJob(job,b.identity.executionId);
  if(!record.jobs.some(j=>j.operation==='restore')||!record.jobs.some(j=>j.operation==='switch')||!record.jobs.some(j=>j.operation==='delete_branch'))fail();
  for(let i=0;i<p.privateChanges.length;i++) {
    const file=path.join(directory,archiveName,`${i}.bin`),entry=record.archived?.[i];
    if(!entry||physicalIdentity(file,false)!==entry.identity||digest(stableBytes(file))!==p.privateChanges[i].after.digest||entry.digest!==p.privateChanges[i].after.digest)fail();
  }
  if(!equal(readdirSync(path.join(directory,archiveName)).sort(),p.privateChanges.map((unused,i)=>`${i}.bin`).sort()))fail();
  const now=invariant(record.parameters.repositoryPath,record,review,{branch:record.parameters.baseBranch,deleted:true});
  if(now.digest!==record.finalFootprintDigest||captureNativeFootprint(record.parameters.repositoryPath,{head:record.parameters.baselineCommit,branch:record.parameters.baseBranch,origin:record.parameters.origin}).digest!==now.digest)fail();
  if(!equal(readSigned(path.join(directory,journalName),key),record))fail();return now;
}
// Only native reconciliation consumes this companion proof. The original
// REFUSED review remains immutable and never becomes a verified candidate.
export function verifyRefusedTrackedRollbackDisposition(directory,workspace) {
  const review=originalReview(directory),key=readFileSync(path.join(directory,'integrity.key'));
  const record=readSigned(path.join(directory,journalName),key),parameters=record.parameters;
  if(workspace?.root!==parameters?.repositoryPath||workspace.expected?.head!==parameters?.baselineCommit
    ||workspace.expected.branch!==parameters?.baseBranch||workspace.expected.origin!==parameters?.origin)fail();
  verifyRecord(directory,record,review);return Object.freeze({completed:true,reviewDigest:review.digest,journalDigest:nativeArtifactSnapshot(path.join(directory,journalName)).digest});
}

export async function rollbackRefusedTrackedCandidate(options) {
  const {directory,repositoryPath,baselineCommit,taskBranch,baseBranch,origin,assertOwnerAuthority,onCheckpoint=()=>{}}=options;
  if(typeof assertOwnerAuthority!=='function')fail();const review=originalReview(directory),scope=optionsScope(options,review),p=review.payload,b=p.binding;
  const state=path.dirname(directory),key=readFileSync(path.join(directory,'integrity.key')),journalFile=path.join(directory,journalName);
  const controllerFile=path.join(directory,'.refused-tracked-rollback-controller.json'),barrierPath=path.join(state,recoveryLockFilename),archive=path.join(directory,archiveName);
  await assertOwnerAuthority(scope);let record=existsSync(journalFile)?readSigned(journalFile,key):null;
  const phases=['archive_intent','archived','restore_intent','restored','switch_intent','switched','delete_branch_intent','branch_deleted','complete'];
  if(record&&(!equal(record.scope,scope)||record.version!==1||record.reviewIdentity!==review.identity||record.directoryIdentity!==review.directoryIdentity
    ||record.stateIdentity!==physicalIdentity(state)||!phases.includes(record.phase)))fail();
  if(record?.phase==='complete') {
    verifyRecord(directory,record,review);await assertOwnerAuthority(scope);
    if(existsSync(controllerFile)){const old=readSigned(controllerFile,key);if(old.reviewDigest!==review.digest||old.self!==physicalIdentity(controllerFile,false))fail();gone(old.owner);unlinkSync(controllerFile);}
    if(existsSync(barrierPath)){const barrier=nativeArtifactSnapshot(barrierPath);if(barrier.digest!==record.barrier.digest||barrier.identity!==record.barrier.identity)fail();unlinkSync(barrierPath);}
    return receipt(true);
  }
  // A lost closed-Job receipt cannot be inferred from absent PIDs or replayed.
  if(record?.pendingJob)fail();inspectRefusedTrackedRollbackScope(options);
  if(existsSync(controllerFile)) {const old=readSigned(controllerFile,key);if(old.reviewDigest!==review.digest||old.self!==physicalIdentity(controllerFile,false))fail();gone(old.owner);unlinkSync(controllerFile);}
  const fd=openSync(controllerFile,'wx',0o600);try{writeFileSync(fd,signed(key,{reviewDigest:review.digest,owner:currentNativeProcessIdentity(),self:physicalIdentity(controllerFile,false)}));fsyncSync(fd);}finally{closeSync(fd);}
  const controller=nativeArtifactSnapshot(controllerFile);
  try {
    if(!record) {
      if(existsSync(barrierPath)||existsSync(archive))fail();
      const original=captureNativeFootprint(repositoryPath,{head:baselineCommit,branch:taskBranch,origin});
      if(original.digest!==p.postFootprintDigest||original.dirty.length!==p.privateChanges.length
        ||original.dirty.some(r=>r.status!==' M'||!p.privateChanges.some(c=>c.path===r.path&&c.after.digest===r.digest))
        ||git(repositoryPath,['rev-parse',`refs/heads/${baseBranch}`])!==baselineCommit||git(repositoryPath,['rev-parse',`refs/heads/${taskBranch}`])!==baselineCommit)fail();
      for(const r of p.privateChanges)stableBytes(path.join(repositoryPath,r.path),r.after);
      record={version:1,scope,parameters:{repositoryPath,baselineCommit,taskBranch,baseBranch,origin,writePaths:options.writePaths.map(nativeRelative)},
        reviewIdentity:review.identity,directoryIdentity:review.directoryIdentity,stateIdentity:physicalIdentity(state),phase:'archive_intent',original,
        protectedGitDigest:protectedGit(repositoryPath,taskBranch),indexEntriesDigest:nativeDigest(git(repositoryPath,['ls-files','--stage','-z'])),
        refs:git(repositoryPath,['for-each-ref','--format=%(refname) %(objectname)']),baselineFiles:restoreBasis(repositoryPath,baselineCommit,p.privateChanges),
        archived:[],archiveIdentity:null,barrier:null,pendingJob:null,jobs:[],finalFootprintDigest:null};persist();
    }
    if(!record.barrier) {
      const value={schemaVersion:scope.schemaVersion,reviewDigest:review.digest,scopeDigest:nativeDigest(scope)};
      if(existsSync(barrierPath)){if(!equal(readSigned(barrierPath,key),value))fail();}
      else{const f=openSync(barrierPath,'wx',0o600);try{writeFileSync(f,signed(key,value));fsyncSync(f);}finally{closeSync(f);}}
      record.barrier=nativeArtifactSnapshot(barrierPath);persist();
    }
    if(!record.archiveIdentity){if(!existsSync(archive))mkdirSync(archive);record.archiveIdentity=physicalIdentity(archive);persist();}
    await check();
    for(let i=0;i<p.privateChanges.length;i++) {
      const r=p.privateChanges[i],file=path.join(archive,`${i}.bin`);
      if(!record.archived[i]) {
        if(record.phase!=='archive_intent')fail();const bytes=stableBytes(path.join(repositoryPath,r.path),r.after);
        if(!existsSync(file)){const f=openSync(file,'wx',0o600);try{writeFileSync(f,bytes);fsyncSync(f);}finally{closeSync(f);}}
        if(!stableBytes(file).equals(bytes))fail();record.archived[i]={identity:physicalIdentity(file,false),digest:r.after.digest};persist();
      }
      if(physicalIdentity(file,false)!==record.archived[i].identity||digest(stableBytes(file))!==r.after.digest)fail();
    }
    if(record.phase==='archive_intent'){record.phase='archived';persist();await onCheckpoint('archived');}
    const runtime=path.join(directory,`restore-job-${randomUUID()}`);mkdirSync(runtime);const launcher=await buildWindowsJobLauncher(runtime);
    const executable=realpathSync.native(execFileSync('where.exe',['git.exe'],{env:environment(),windowsHide:true,encoding:'utf8',timeout:5000,maxBuffer:32768}).trim().split(/\r?\n/)[0]),executableDigest=digest(readFileSync(executable));
    const mutate=async(operation,args)=>{
      await check();if(realpathSync.native(executable)!==executable||!lstatSync(executable).isFile()||digest(readFileSync(executable))!==executableDigest)fail();
      invariant(repositoryPath,record,review,{branch:operation==='delete_branch'?baseBranch:taskBranch,allowRestored:operation==='restore'});
      const job=await(await startWindowsJob(launcher,{executable,argv:gitArgs(args),cwd:repositoryPath,environment:environment(),input:'',durationMs:15000,attempt:b.identity.executionId,
        confirmResume:assignment=>{record.pendingJob={operation,...assignment};persist();return nativeDigest(record.pendingJob);}})).completion;
      if(!isWindowsJobCleanupReceipt(job)||job.rootExit!==0||job.jobClosed!==true||job.terminationReason!=='root_exit')fail();
      record.jobs.push({...structuredClone(job),operation});record.pendingJob=null;persist();await onCheckpoint(`${operation}_effect`);
    };
    if(['archived','restore_intent'].includes(record.phase)) {
      const observed=invariant(repositoryPath,record,review,{branch:taskBranch,allowRestored:true});
      if(record.phase==='archived'&&observed.digest!==p.postFootprintDigest)fail();
      if(observed.dirty.length) {
        record.phase='restore_intent';persist();await onCheckpoint('restore_intent');await check();
        invariant(repositoryPath,record,review,{branch:taskBranch,allowRestored:true});
        await mutate('restore',['restore',`--source=${baselineCommit}`,'--worktree','--',...p.privateChanges.map(r=>r.path)]);
      } else if(!record.jobs.some(j=>j.operation==='restore'))fail();
      invariant(repositoryPath,record,review,{branch:taskBranch});record.phase='restored';persist();await onCheckpoint('restored');
    }
    if(['restored','switch_intent'].includes(record.phase)) {
      const branch=git(repositoryPath,['symbolic-ref','--short','HEAD']);if(branch!==taskBranch&&!(record.phase==='switch_intent'&&branch===baseBranch))fail();
      invariant(repositoryPath,record,review,{branch});
      if(branch===taskBranch){record.phase='switch_intent';persist();await onCheckpoint('switch_intent');await mutate('switch',['switch','--no-guess',baseBranch]);}
      else if(!record.jobs.some(j=>j.operation==='switch'))fail();
      invariant(repositoryPath,record,review,{branch:baseBranch});record.phase='switched';persist();await onCheckpoint('switched');
    }
    if(['switched','delete_branch_intent'].includes(record.phase)) {
      const refs=git(repositoryPath,['for-each-ref','--format=%(refname) %(objectname)']);
      if(refs===record.refs){invariant(repositoryPath,record,review,{branch:baseBranch});record.phase='delete_branch_intent';persist();await onCheckpoint('delete_branch_intent');
        await mutate('delete_branch',['update-ref','-d',`refs/heads/${taskBranch}`,baselineCommit]);}
      else if(record.phase!=='delete_branch_intent'||!record.jobs.some(j=>j.operation==='delete_branch'))fail();
      invariant(repositoryPath,record,review,{branch:baseBranch,deleted:true});record.phase='branch_deleted';persist();await onCheckpoint('branch_deleted');
    }
    await check();const final=invariant(repositoryPath,record,review,{branch:baseBranch,deleted:true});
    record.finalFootprintDigest=final.digest;record.phase='complete';persist();verifyRecord(directory,record,review);await onCheckpoint('complete');
    const finalBarrier=nativeArtifactSnapshot(barrierPath);if(finalBarrier.digest!==record.barrier.digest||finalBarrier.identity!==record.barrier.identity)fail();unlinkSync(barrierPath);return receipt(false);
  }finally{if(existsSync(controllerFile)&&nativeArtifactSnapshot(controllerFile).digest===controller.digest)unlinkSync(controllerFile);}
  function persist(){atomic(journalFile,signed(key,record));}
  async function check(){await assertOwnerAuthority(scope);if(physicalIdentity(state)!==record.stateIdentity||physicalIdentity(directory)!==review.directoryIdentity
    ||physicalIdentity(repositoryPath)!==b.rootIdentity||physicalIdentity(archive)!==record.archiveIdentity||readDurableNativeReview(directory).digest!==review.digest
    ||nativeArtifactSnapshot(controllerFile).digest!==controller.digest||nativeArtifactSnapshot(barrierPath).digest!==record.barrier.digest||!equal(readSigned(journalFile,key),record))fail();
    for(const v of [b.writer,b.lease,b.spent,record.barrier])artifact(state,v);gone(b.writer.record.ownerProcess);stoppedJob(p.job,b.identity.executionId);}
  function receipt(replay){return Object.freeze({schemaVersion:scope.schemaVersion,completed:true,replay,executionId:b.identity.executionId,reviewDigest:review.digest,
    journalDigest:nativeArtifactSnapshot(journalFile).digest,archivedFileCount:p.privateChanges.length,restoredFileCount:p.privateChanges.length,baselineCommit,
    cleanBaseBranch:true,taskBranchRemoved:true,writerLeaseRetained:true,releaseAllowed:false,executionAuthorized:false,modelsInvoked:false,remoteEffects:false});}
}
