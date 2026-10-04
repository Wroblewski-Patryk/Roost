// Read-only, lossless qualification of an oversized review patch. Source bytes
// are never written: complete normalized hunks are reconstructed in memory,
// and every exact Git blob remains bound by the certificate. The reviewer must
// assess the recorded EOL transformation; this does not declare it harmless.
import { createHash } from 'node:crypto';
import { z } from 'zod';

const hash=z.string().regex(/^[a-f0-9]{64}$/),oid=z.string().regex(/^[a-f0-9]{40}$/);
const filePath=z.string().min(1).max(512).regex(/^[A-Za-z0-9_.\/-]+$/);
const blobSchema=z.object({blob:oid,sha256:hash,bytes:z.number().int().min(0).max(1048576),
  endings:z.enum(['lf','crlf','none']),newlines:z.number().int().min(0).max(1048576),
  normalizedSha256:hash,normalizedBytes:z.number().int().min(0).max(1048576)}).strict();
export const qualifiedCrlfDiffCertificateSchema=z.object({schemaVersion:z.literal('roost-review-crlf-diff-v1'),
  baselineCommit:oid,reviewedCommit:oid,originalDiffDigest:hash,originalDiffBytes:z.number().int().min(32769).max(8388608),
  representedDiffDigest:hash,representedDiffBytes:z.number().int().min(0).max(32768),changedFilesDigest:hash,
  files:z.array(z.object({path:filePath,change:z.enum(['modified','added']),before:blobSchema.nullable(),after:blobSchema}).strict()).min(1).max(32)
}).strict();
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=reason=>{throw Object.assign(Error('qualified_crlf_review_diff_unproven'),{protocolAdmission:true,retryable:false,details:{reason}});};
const utf8=bytes=>{try{const value=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);if(!Buffer.from(value,'utf8').equals(bytes))fail('review_diff_encoding_invalid');return value;}catch{fail('review_diff_encoding_invalid');}};
function relative(value){if(!filePath.safeParse(value).success||value.startsWith('/')||value.split('/').some(v=>!v||v==='.'||v==='..'||v==='.git'))fail('review_diff_path_invalid');return value;}
function bytes(value){if(Buffer.isBuffer(value))return value;if(typeof value==='string')return Buffer.from(value,'utf8');fail('review_diff_encoding_invalid');}
function call(git,args){let value;try{value=git(args,{binary:true});}catch{fail('review_diff_git_read_invalid');}if(!Buffer.isBuffer(value)||value.length>8388608)fail('review_diff_git_read_invalid');return value;}
function readBlob(git,commit,file,absent=false){
  const tree=utf8(call(git,['ls-tree','--full-tree','-z',commit,'--',file]));
  if(!tree&&absent)return null;
  const match=/^100644 blob ([a-f0-9]{40})\t([^\0]+)\0$/.exec(tree);
  if(!match||match[2]!==file)fail('review_diff_tree_invalid');
  const raw=call(git,['cat-file','blob',match[1]]);
  if(raw.length>1048576||raw.includes(0))fail('review_diff_blob_invalid');
  if(createHash('sha1').update(Buffer.from(`blob ${raw.length}\0`)).update(raw).digest('hex')!==match[1])fail('review_diff_blob_binding_invalid');
  const text=utf8(raw);if(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text))fail('review_diff_binary_invalid');
  const normalized=text.replace(/\r\n/g,'\n');if(normalized.includes('\r'))fail('review_diff_lone_cr_invalid');
  const crlf=(text.match(/\r\n/g)??[]).length,lf=(normalized.match(/\n/g)??[]).length;
  if(crlf&&crlf!==lf)fail('review_diff_mixed_endings');
  const endings=lf?(crlf?'crlf':'lf'):'none',normalizedBytes=Buffer.from(normalized,'utf8');
  if(!Buffer.from(endings==='crlf'?normalized.replace(/\n/g,'\r\n'):normalized,'utf8').equals(raw))fail('review_diff_reconstruction_invalid');
  return {text:normalized,evidence:{blob:match[1],sha256:digest(raw),bytes:raw.length,endings,newlines:lf,
    normalizedSha256:digest(normalizedBytes),normalizedBytes:normalizedBytes.length}};
}
const tokens=text=>text.match(/[^\n]*\n|[^\n]+$/g)??[];
const append=(target,source,start,end=source.length)=>{for(let n=start;n<end;n++)target.push(source[n]);};
const frozen=value=>{if(value&&typeof value==='object'){for(const row of Object.values(value))frozen(row);Object.freeze(value);}return value;};
// Apply every complete qualified unified hunk, including final-newline markers.
// No application checkout, Git index or temporary files participate.
function reconstructPatch(patch,files){
  const lines=patch.split('\n');if(lines.at(-1)==='')lines.pop();
  const sections=new Map();let i=0;
  while(i<lines.length){
    const header=/^diff --git a\/([A-Za-z0-9_.\/-]+) b\/([A-Za-z0-9_.\/-]+)$/.exec(lines[i++]);
    if(!header||header[1]!==header[2]||sections.has(header[1])||!files.has(header[1]))fail('review_diff_patch_path_invalid');
    const file=files.get(header[1]),source=tokens(file.before?.text??''),output=[];let cursor=0,sawIndex=false,sawOld=false,sawNew=false,sawHunk=false;
    while(i<lines.length&&!lines[i].startsWith('diff --git ')){
      const line=lines[i++];
      if(!sawHunk){
        const index=/^index ([a-f0-9]{7,40})\.\.([a-f0-9]{7,40})(?: 100644)?$/.exec(line);
        if(index){if(sawIndex||!(file.before?file.before.evidence.blob.startsWith(index[1]):/^0+$/.test(index[1]))||!file.after.evidence.blob.startsWith(index[2]))fail('review_diff_patch_index_invalid');sawIndex=true;continue;}
        if(line==='new file mode 100644'&&!file.before)continue;
        if(line===`--- ${file.before?'a/'+header[1]:'/dev/null'}`){if(sawOld)fail('review_diff_patch_invalid');sawOld=true;continue;}
        if(line===`+++ b/${header[1]}`){if(sawNew)fail('review_diff_patch_invalid');sawNew=true;continue;}
      }
      const hunk=/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(?:.*)$/.exec(line);
      if(!hunk||!sawIndex||!sawOld||!sawNew)fail('review_diff_patch_invalid');sawHunk=true;
      const oldStart=Number(hunk[1]),oldCount=hunk[2]===undefined?1:Number(hunk[2]),newStart=Number(hunk[3]),newCount=hunk[4]===undefined?1:Number(hunk[4]);
      const offset=oldCount?oldStart-1:oldStart,newOffset=newCount?newStart-1:newStart;
      if(offset<cursor||offset>source.length)fail('review_diff_patch_range_invalid');append(output,source,cursor,offset);cursor=offset;
      if(newOffset!==output.length)fail('review_diff_patch_range_invalid');let oldUsed=0,newUsed=0;
      while(i<lines.length&&!lines[i].startsWith('@@ ')&&!lines[i].startsWith('diff --git ')){
        const row=lines[i++],op=row[0];if(![' ','+','-'].includes(op))fail('review_diff_patch_invalid');
        let value=row.slice(1)+'\n';if(lines[i]==='\\ No newline at end of file'){value=row.slice(1);i++;}
        if(op!=='+' ){if(source[cursor++]!==value)fail('review_diff_patch_source_invalid');oldUsed++;}
        if(op!=='-' ){output.push(value);newUsed++;}
      }
      if(oldUsed!==oldCount||newUsed!==newCount)fail('review_diff_patch_count_invalid');
    }
    if(!sawIndex)fail('review_diff_patch_invalid');append(output,source,cursor);
    if(output.join('')!==file.after.text)fail('review_diff_patch_reconstruction_invalid');sections.set(header[1],true);
  }
  for(const [file,value]of files)if(!sections.has(file)&&(value.before?.text??'')!==value.after.text)fail('review_diff_patch_incomplete');
}

/** Callback: git(args,{binary:true}) -> exact Buffer from a hermetic, bounded
 * Git reader. Legacy raw results remain unchanged. Qualified output is sealed
 * by the caller's ordinary repository evidence; this helper grants no review,
 * execution or release authority. Certificate rows cover EVERY changed path. */
export function collectQualifiedCrlfReviewDiff({git,baselineCommit,reviewedCommit,changedFiles,rawDiff}){
  const raw=bytes(rawDiff);if(!raw.length)fail('review_diff_invalid');
  if(raw.length<=32768)return Object.freeze({diff:typeof rawDiff==='string'?rawDiff:utf8(raw),certificate:null});
  if(raw.length>8388608||typeof git!=='function'||!oid.safeParse(baselineCommit).success||!oid.safeParse(reviewedCommit).success
    ||baselineCommit===reviewedCommit||!Array.isArray(changedFiles)||!changedFiles.length||changedFiles.length>32)fail('review_diff_basis_invalid');
  const paths=changedFiles.map(relative).sort();if(new Set(paths).size!==paths.length)fail('review_diff_paths_mismatch');
  for(const commit of [baselineCommit,reviewedCommit])if(utf8(call(git,['rev-parse',`${commit}^{commit}`])).trim()!==commit)fail('review_diff_commit_invalid');
  const diffArgs=['diff','--binary','--no-ext-diff','--no-textconv',baselineCommit,reviewedCommit,'--'];
  if(!call(git,diffArgs).equals(raw))fail('review_diff_raw_binding_invalid');
  const status=utf8(call(git,['diff','--name-status','--no-renames','-z',baselineCommit,reviewedCommit,'--'])).split('\0');
  if(status.pop()!=='')fail('review_diff_paths_mismatch');const actual=[];
  for(let i=0;i<status.length;i+=2){if(!['M','A'].includes(status[i])||typeof status[i+1]!=='string')fail('review_diff_change_invalid');actual.push({path:relative(status[i+1]),change:status[i]==='A'?'added':'modified'});}
  actual.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);if(JSON.stringify(actual.map(v=>v.path).sort())!==JSON.stringify(paths))fail('review_diff_paths_mismatch');
  const files=new Map();let conversion=false;
  for(const row of actual){const before=readBlob(git,baselineCommit,row.path,row.change==='added'),after=readBlob(git,reviewedCommit,row.path);
    if(row.change==='added'&&before!==null||row.change==='modified'&&!before)fail('review_diff_change_invalid');
    if(before?.evidence.endings==='crlf'&&after.evidence.endings==='lf')fail('review_diff_conversion_invalid');
    if(before?.evidence.endings==='lf'&&after.evidence.endings==='crlf')conversion=true;
    files.set(row.path,{...row,before,after});}
  if(!conversion)fail('review_diff_conversion_unproven');
  const representedRaw=call(git,['diff','--binary','--no-ext-diff','--no-textconv','--ignore-cr-at-eol',baselineCommit,reviewedCommit,'--']);
  const patch=utf8(representedRaw).replace(/\r\n/g,'\n');if(patch.includes('\r')||Buffer.byteLength(patch)>32768)fail('review_diff_representation_invalid');
  reconstructPatch(patch,files);
  const certificate=qualifiedCrlfDiffCertificateSchema.parse({schemaVersion:'roost-review-crlf-diff-v1',baselineCommit,reviewedCommit,
    originalDiffDigest:digest(raw),originalDiffBytes:raw.length,representedDiffDigest:digest(Buffer.from(patch,'utf8')),representedDiffBytes:Buffer.byteLength(patch),
    changedFilesDigest:digest(Buffer.from(JSON.stringify(paths))),files:[...files.values()].map(v=>({path:v.path,change:v.change,before:v.before?.evidence??null,after:v.after.evidence}))});
  return frozen({diff:patch,certificate});
}
