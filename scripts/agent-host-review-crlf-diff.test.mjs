import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash,randomUUID } from 'node:crypto';
import { writeFileSync,readFileSync,unlinkSync,renameSync,realpathSync } from 'node:fs';
import { collectQualifiedCrlfReviewDiff,qualifiedCrlfDiffCertificateSchema } from './lib/agent-host-review-crlf-diff.mjs';
import { createNativeOwnedRepositoryTemp,inspectNativeOwnedTemp,cleanupNativeOwnedTemp,nativeDigest } from './lib/agent-host-native-footprint.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function fixture(t,change){
  const attempt=randomUUID(),owned=createNativeOwnedRepositoryTemp(realpathSync.native(os.tmpdir()),attempt),directory=inspectNativeOwnedTemp(owned,attempt).root,root=path.join(directory,'repository');
  t.after(()=>assert.equal(cleanupNativeOwnedTemp(owned,attempt).remaining,0));
  const environment={PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,TEMP:process.env.TEMP,TMP:process.env.TMP,GIT_OPTIONAL_LOCKS:'0',GIT_NO_REPLACE_OBJECTS:'1',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null'};
  const git=(args,{binary=false}={})=>execFileSync('git',['--literal-pathspecs','-c','core.fsmonitor=false','-c','core.untrackedCache=false','-c','core.hooksPath=NUL',...args],{cwd:root,env:environment,windowsHide:true,encoding:binary?undefined:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:8388608,timeout:10000});
  git(['init','-b','main']);git(['config','user.name','Review Fixture']);git(['config','user.email','review@example.invalid']);git(['config','core.autocrlf','false']);
  const before=Array.from({length:9000},(_,i)=>`baseline line ${String(i).padStart(5,'0')}: ordinary text\n`).join('');
  writeFileSync(path.join(root,'large.txt'),before);writeFileSync(path.join(root,'space.txt'),'preserve trailing space \n');
  git(['add','--','large.txt','space.txt']);git(['-c','commit.gpgsign=false','commit','-m','baseline']);const baselineCommit=git(['rev-parse','HEAD']).trim();
  let after=before.replace('baseline line 04500: ordinary text','baseline line 04500: actual semantic edit').replace(/\n/g,'\r\n');
  writeFileSync(path.join(root,'large.txt'),after);writeFileSync(path.join(root,'space.txt'),'preserve trailing space  \r\n');writeFileSync(path.join(root,'new-test.txt'),'new regression\r\n');
  const afterStage=change?.({root,git,before,after});git(['add','-A','--']);if(typeof afterStage==='function')afterStage();git(['-c','commit.gpgsign=false','commit','-m','candidate']);const reviewedCommit=git(['rev-parse','HEAD']).trim();
  const changedFiles=git(['diff','--name-only','--no-renames',baselineCommit,reviewedCommit,'--']).trim().split('\n');
  const rawDiff=git(['diff','--binary','--no-ext-diff','--no-textconv',baselineCommit,reviewedCommit,'--'],{binary:true});
  assert.ok(rawDiff.length>32768);return {root,git,baselineCommit,reviewedCommit,changedFiles,rawDiff};
}

test('large real Git LF to CRLF patch preserves real edits, spaces and all exact blob bindings without source/index effects',t=>{
  const x=fixture(t),index=readFileSync(path.join(x.root,'.git','index')),source=readFileSync(path.join(x.root,'large.txt'));
  const result=collectQualifiedCrlfReviewDiff(x),c=result.certificate;
  assert.ok(Buffer.byteLength(result.diff)<32768);assert.ok(result.diff.includes('+baseline line 04500: actual semantic edit'));
  assert.ok(result.diff.includes('+preserve trailing space  \n'));assert.ok(result.diff.includes('+new regression'));
  assert.equal(c.schemaVersion,'roost-review-crlf-diff-v1');assert.equal(c.baselineCommit,x.baselineCommit);assert.equal(c.reviewedCommit,x.reviewedCommit);
  assert.equal(c.originalDiffDigest,sha(x.rawDiff));assert.equal(c.originalDiffBytes,x.rawDiff.length);
  assert.equal(c.representedDiffDigest,sha(Buffer.from(result.diff)));assert.equal(c.representedDiffBytes,Buffer.byteLength(result.diff));
  assert.equal(c.changedFilesDigest,nativeDigest([...x.changedFiles].sort()));assert.deepEqual(c.files.map(v=>v.path).sort(),[...x.changedFiles].sort());
  for(const file of c.files){const after=x.git(['cat-file','blob',file.after.blob],{binary:true});assert.equal(file.after.sha256,sha(after));assert.equal(file.after.bytes,after.length);
    assert.equal(file.after.normalizedSha256,sha(Buffer.from(after.toString('utf8').replace(/\r\n/g,'\n'))));assert.equal(file.after.endings,'crlf');
    if(file.before){assert.equal(file.before.endings,'lf');assert.equal(file.before.sha256,sha(x.git(['cat-file','blob',file.before.blob],{binary:true})));}else assert.equal(file.change,'added');}
  assert.deepEqual(readFileSync(path.join(x.root,'.git','index')),index);assert.deepEqual(readFileSync(path.join(x.root,'large.txt')),source);
  assert.equal(qualifiedCrlfDiffCertificateSchema.safeParse({...c,unknown:true}).success,false);
});

test('legacy small raw diff remains exact and needs neither callback nor certificate',()=>{
  const input=' diff --git a/file b/file\n+space  \n';
  assert.deepEqual(collectQualifiedCrlfReviewDiff({rawDiff:input}),{diff:input,certificate:null});
  const trimmed=input.trim();assert.deepEqual(collectQualifiedCrlfReviewDiff({rawDiff:trimmed}),{diff:trimmed,certificate:null});
});

test('an EOL-only changed file stays in the full certificate even when Git emits no semantic hunk for it',t=>{
  const x=fixture(t,({root,before})=>writeFileSync(path.join(root,'large.txt'),before.replace(/\n/g,'\r\n')));
  const result=collectQualifiedCrlfReviewDiff(x),file=result.certificate.files.find(v=>v.path==='large.txt');
  assert.equal(result.diff.includes('diff --git a/large.txt'),false);assert.ok(result.diff.includes('+preserve trailing space  \n'));
  assert.equal(file.before.normalizedSha256,file.after.normalizedSha256);assert.notEqual(file.before.sha256,file.after.sha256);
  assert.equal(result.certificate.files.length,x.changedFiles.length);
});

for(const [name,modify]of [
  ['mixed endings',({root})=>writeFileSync(path.join(root,'space.txt'),'one\r\ntwo\n')],
  ['lone CR',({root})=>writeFileSync(path.join(root,'space.txt'),'one\rtwo\r\n')],
  ['NUL binary',({root})=>writeFileSync(path.join(root,'space.txt'),Buffer.from([0,1,2]))],
  ['strict UTF8',({root})=>writeFileSync(path.join(root,'space.txt'),Buffer.from([0xff,0xfe]))],
  ['deletion',({root})=>unlinkSync(path.join(root,'space.txt'))],
  ['rename',({root})=>renameSync(path.join(root,'space.txt'),path.join(root,'renamed.txt'))],
  ['symlink Git mode',({git})=>()=>{const object=git(['hash-object','-w','space.txt']).trim();git(['update-index','--cacheinfo',`120000,${object},space.txt`]);}],
  ['oversized normalized patch',({root,before})=>writeFileSync(path.join(root,'large.txt'),before.replace(/ordinary text/g,'every line was semantically changed').replace(/\n/g,'\r\n'))],
  ['oversized exact blob',({root})=>writeFileSync(path.join(root,'large.txt'),'large source text\r\n'.repeat(70000))]
])test(`${name} is refused rather than hidden`,t=>{
  const x=fixture(t,modify);assert.throws(()=>collectQualifiedCrlfReviewDiff(x),/qualified_crlf_review_diff_unproven/);
});

test('missing, extra and duplicate result paths cannot hide actual changes',t=>{
  const x=fixture(t);for(const changedFiles of [x.changedFiles.slice(1),[...x.changedFiles,'foreign.txt'],[...x.changedFiles,x.changedFiles[0]]])
    assert.throws(()=>collectQualifiedCrlfReviewDiff({...x,changedFiles}),/qualified_crlf_review_diff_unproven/);
});

test('raw bytes, exact tree/object identity and complete normalized hunks are independently bound',t=>{
  const x=fixture(t);
  assert.throws(()=>collectQualifiedCrlfReviewDiff({...x,rawDiff:Buffer.concat([x.rawDiff,Buffer.from('forged')])}),/qualified_crlf_review_diff_unproven/);
  const wrongBlob=(args,options)=>args[0]==='cat-file'?Buffer.from('wrong exact source'):x.git(args,options);
  assert.throws(()=>collectQualifiedCrlfReviewDiff({...x,git:wrongBlob}),/qualified_crlf_review_diff_unproven/);
  const wrongTree=(args,options)=>args[0]==='ls-tree'?Buffer.from('100755 blob '+'a'.repeat(40)+'\tlarge.txt\0'):x.git(args,options);
  assert.throws(()=>collectQualifiedCrlfReviewDiff({...x,git:wrongTree}),/qualified_crlf_review_diff_unproven/);
  const hiddenPatch=(args,options)=>args.includes('--ignore-cr-at-eol')?Buffer.alloc(0):x.git(args,options);
  assert.throws(()=>collectQualifiedCrlfReviewDiff({...x,git:hiddenPatch}),/qualified_crlf_review_diff_unproven/);
  const alteredPatch=(args,options)=>args.includes('--ignore-cr-at-eol')?Buffer.from(x.git(args,options).toString('utf8').replace('actual semantic edit','concealed semantic edit')):x.git(args,options);
  assert.throws(()=>collectQualifiedCrlfReviewDiff({...x,git:alteredPatch}),/qualified_crlf_review_diff_unproven/);
});

test('final newline absence and BOM bytes remain reconstructable without suppression',t=>{
  const x=fixture(t,({root})=>{writeFileSync(path.join(root,'space.txt'),'preserve trailing space  ');writeFileSync(path.join(root,'new-test.txt'),'\ufeffnew regression');});
  const result=collectQualifiedCrlfReviewDiff(x);assert.ok(result.diff.includes('\\ No newline at end of file'));
  assert.equal(result.certificate.files.find(v=>v.path==='new-test.txt').after.endings,'none');
  assert.equal(result.certificate.files.find(v=>v.path==='new-test.txt').after.bytes,17);
});
