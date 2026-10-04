import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import childProcess from "node:child_process";
import {createHash} from "node:crypto";
import {syncBuiltinESMExports} from "node:module";
import {collectReadOnlyRepositoryEvidence,sealReadOnlyBoundary} from "./lib/agent-host-readonly-boundary.mjs";
import {nativeDigest} from "./lib/agent-host-native-footprint.mjs";

const hash=v=>createHash("sha256").update(v).digest("hex");
const denied=reason=>error=>{assert.equal(error.message,"readonly_boundary_unproven");
 if(reason)assert.equal(error.details.reason,reason);return true;};
function fixture(t,files={"canonical.md":Array.from({length:1800},(_,i)=>`Line ${i+1}: accepted bounded requirement ${"x".repeat(48)}\r\n`).join("")}){
 const parent=fs.realpathSync.native(os.tmpdir()),root=fs.mkdtempSync(path.join(parent,"roost-readonly-fragments-"));
 const git=(...args)=>childProcess.execFileSync("git",["-c","core.hooksPath=",...args],{cwd:root,windowsHide:true,encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim();
 git("init");git("config","user.name","Read-only fragment fixture");git("config","user.email","fixture@example.invalid");git("config","core.autocrlf","false");
 for(const [name,bytes]of Object.entries(files)){fs.mkdirSync(path.dirname(path.join(root,name)),{recursive:true});fs.writeFileSync(path.join(root,name),bytes);}
 git("add",".");git("commit","-m","Synthetic bounded fragment source");git("branch","-m","codex/fragment-fixture");git("remote","add","origin","https://github.com/example/fragment-fixture");
 const expected={head:git("rev-parse","HEAD"),branch:"codex/fragment-fixture",origin:"https://github.com/example/fragment-fixture"};
 const originalExec=childProcess.execFileSync,originalRead=fs.readFileSync;
 let effect=null,dockerEffect=null,dockerCalls=0;
 childProcess.execFileSync=(command,args,options)=>{
  if(command==="powershell"&&args?.at(-1)?.startsWith("Get-NetTCPConnection -State Listen"))return "synthetic_listener\n";
  if(command==="docker"&&args?.[0]==="ps"){dockerCalls++;if(dockerEffect&&dockerCalls===2)dockerEffect();return "";}
  return originalExec(command,args,options);
 };
 fs.readFileSync=(file,...args)=>{const value=originalRead(file,...args);if(typeof file==="number"&&effect){const act=effect;effect=null;act();}return value;};
 syncBuiltinESMExports();
 t.after(()=>{childProcess.execFileSync=originalExec;fs.readFileSync=originalRead;syncBuiltinESMExports();
  assert.equal(path.dirname(root),parent);assert.match(path.basename(root),/^roost-readonly-fragments-/);
  fs.rmSync(root,{recursive:true,force:false});assert.equal(fs.existsSync(root),false);});
 return {root,git,files,expected,collect:options=>collectReadOnlyRepositoryEvidence({repositoryPath:root,expected,...options}),
  mutateDuringRead:act=>{effect=act;},mutateAfterPairedFootprints:act=>{dockerEffect=act;}};
}
test("large tracked canonical source projects exact bounded CRLF lines with separate source and fragment provenance",t=>{
 const f=fixture(t),full=Buffer.from(f.files["canonical.md"]),content=f.files["canonical.md"].split(/(?<=\n)/).slice(30,35).join("");
 assert.ok(full.length>32768);
 const before=f.git("status","--porcelain"),proof=f.collect({fragments:[{path:"canonical.md",startLine:31,endLine:35}]});
 assert.deepEqual(proof.files,[{path:"canonical.md",mimeType:"text/plain",content,sha256:hash(Buffer.from(content)),sourceSha256:hash(full),range:{startLine:31,endLine:35}}]);
 assert.ok(Object.isFrozen(proof.files[0].range));assert.ok(!proof.files[0].content.includes("Line 30:"));
 assert.equal(f.git("status","--porcelain"),before);assert.equal(f.git("rev-parse","HEAD"),proof.head);
 assert.throws(()=>f.collect({paths:["canonical.md"]}),denied("read_file_invalid"));
});
test("disjoint fragments may share a source while whole-file evidence retains its original shape",t=>{
 const f=fixture(t,{"a.md":"one\ntwo\nthree\n","b.txt":"whole\n"});
 const proof=f.collect({paths:["b.txt"],fragments:[{path:"a.md",startLine:1,endLine:1},{path:"a.md",startLine:3,endLine:3}]});
 assert.deepEqual(proof.files[0],{path:"b.txt",mimeType:"text/plain",content:"whole\n",sha256:hash("whole\n")});
 assert.equal(proof.files[1].content,"one\n");assert.equal(proof.files[2].content,"three\n");
 assert.equal(proof.files[1].sourceSha256,proof.files[2].sourceSha256);
});
test("BOM, multibyte UTF8 and final unterminated line retain exact selected bytes; trailing newline is no phantom line",t=>{
 const f=fixture(t,{"a.md":"\ufeffZażółć\r\n終わり","b.md":"only\n","empty.md":""});
 const proof=f.collect({fragments:[{path:"a.md",startLine:1,endLine:1},{path:"a.md",startLine:2,endLine:2}]});
 assert.equal(proof.files[0].content,"\ufeffZażółć\r\n");assert.equal(proof.files[0].sha256,hash(Buffer.from("\ufeffZażółć\r\n")));
 assert.equal(proof.files[1].content,"終わり");
 for(const path of ["b.md","empty.md"])assert.throws(()=>f.collect({fragments:[{path,startLine:2,endLine:2}]}),denied("read_fragment_range_invalid"));
});
test("selection rejects invalid keys, counts, range bounds, duplicate/overlapping ranges and whole-file conflicts",t=>{
 const f=fixture(t),row={path:"canonical.md",startLine:1,endLine:2};
 for(const fragments of [[{...row,extra:true}],[{...row,startLine:0}],[{...row,startLine:2,endLine:1}],
  [{...row,startLine:1.1}],[{...row,endLine:202}],[{...row,endLine:Number.MAX_SAFE_INTEGER+1}],[null]])
  assert.throws(()=>f.collect({fragments}),denied("read_fragment_selection_invalid"));
 for(const fragments of [[row,row],[row,{...row,startLine:2,endLine:3}]])assert.throws(()=>f.collect({fragments}),denied("read_fragment_selection_conflict"));
 assert.throws(()=>f.collect({paths:["canonical.md"],fragments:[row]}),denied("read_fragment_selection_conflict"));
 assert.throws(()=>f.collect({paths:[],fragments:[]}),denied("read_paths_invalid"));
 assert.throws(()=>f.collect({fragments:Array.from({length:33},(_,i)=>({path:"canonical.md",startLine:i+1,endLine:i+1}))}),denied("read_paths_invalid"));
 assert.throws(()=>f.collect({fragments:[{...row,startLine:1801,endLine:1801}]}),denied("read_fragment_range_invalid"));
});
test("outside, secret, untracked and non-file sources fail closed",t=>{
 const f=fixture(t);fs.writeFileSync(path.join(f.root,"untracked.txt"),"not committed");
 // An untracked source also makes the repository dirty; neither is admitted.
 assert.throws(()=>f.collect({fragments:[{path:"untracked.txt",startLine:1,endLine:1}]}),denied());
 fs.unlinkSync(path.join(f.root,"untracked.txt"));
 for(const relative of ["../outside","C:/outside",".git/config",".env"])
  assert.throws(()=>f.collect({fragments:[{path:relative,startLine:1,endLine:1}]}),denied());
 assert.throws(()=>f.collect({fragments:[{path:"missing.txt",startLine:1,endLine:1}]}),denied());
});
test("source maximum and selected total budget are enforced jointly with whole files",t=>{
 const f=fixture(t,{"huge.md":"x".repeat(1048577),"wide.md":`${"a".repeat(32768)}\n${"b".repeat(32768)}\n`,"whole.txt":"z".repeat(32768)});
 assert.throws(()=>f.collect({fragments:[{path:"huge.md",startLine:1,endLine:1}]}),denied("read_fragment_source_invalid"));
 assert.throws(()=>f.collect({fragments:[{path:"wide.md",startLine:1,endLine:2}]}),denied("read_file_budget_exceeded"));
 assert.throws(()=>f.collect({paths:["whole.txt"],fragments:[{path:"wide.md",startLine:1,endLine:1}]}),denied("read_file_budget_exceeded"));
});
test("invalid UTF8 anywhere in source and selected credentials are never projected",t=>{
 const f=fixture(t,{"invalid.md":Buffer.from([0x61,0x0a,0xff]),"private.md":"password=synthetic-private-value\n"});
 assert.throws(()=>f.collect({fragments:[{path:"invalid.md",startLine:1,endLine:1}]}),denied("read_fragment_encoding_invalid"));
 assert.throws(()=>f.collect({fragments:[{path:"private.md",startLine:1,endLine:1}]}),denied("read_file_redaction_blocked"));
});
test("source replacement during read is rejected before projection",t=>{
 const f=fixture(t,{"a.md":"selected\nunselected\n"});
 f.mutateDuringRead(()=>fs.writeFileSync(path.join(f.root,"a.md"),"selected\nDIFFERENT!\n"));
 assert.throws(()=>f.collect({fragments:[{path:"a.md",startLine:1,endLine:1}]}),denied("read_fragment_source_changed"));
});
test("changing only unselected source lines after paired footprints invalidates provenance",t=>{
 const f=fixture(t,{"a.md":"selected\nunselected\n"});
 f.mutateAfterPairedFootprints(()=>fs.writeFileSync(path.join(f.root,"a.md"),"selected\nDIFFERENT!\n"));
 assert.throws(()=>f.collect({fragments:[{path:"a.md",startLine:1,endLine:1}]}),denied("read_fragment_source_changed"));
});
test("sealing binds exact whole paths and fragment order/ranges; recomputing evidence digest cannot expand selection",t=>{
 const f=fixture(t,{"a.md":"one\ntwo\nthree\n","b.txt":"whole\n"}),fragments=[{path:"a.md",startLine:1,endLine:1},{path:"a.md",startLine:3,endLine:3}];
 const evidence=f.collect({paths:["b.txt"],fragments});
 const seal=(boundary,repositoryEvidence=evidence)=>sealReadOnlyBoundary({envelope:{contract:{nativeBoundary:boundary}},repositoryEvidence});
 // A matching selection passes the selection guard; this deliberately lacks a
 // valid startup receipt and must then stop at the next independent guard.
 assert.throws(()=>seal({readPaths:["b.txt"],readFragments:fragments}),denied("startup_binding_invalid"));
 for(const boundary of [
  {readPaths:["a.md"],readFragments:fragments},
  {readPaths:["b.txt"],readFragments:fragments.slice(0,1)},
  {readPaths:["b.txt"],readFragments:[...fragments].reverse()},
  {readPaths:["b.txt"],readFragments:[{...fragments[0],endLine:2},fragments[1]]},
  {readPaths:["b.txt"]}
 ])assert.throws(()=>seal(boundary),denied());
 const reseal=mutation=>{const changed=structuredClone(evidence);mutation(changed);delete changed.digest;changed.digest=nativeDigest(changed);return changed;};
 for(const mutation of [e=>e.files[1].range.endLine=2,e=>e.files[1].content="other\n",e=>delete e.files[1].sourceSha256,
  e=>e.files[1].range.extra=true,e=>e.files[0].range={startLine:1,endLine:1}])
  assert.throws(()=>seal({readPaths:["b.txt"],readFragments:fragments},reseal(mutation)),denied("repository_evidence_selection_mismatch"));
});
test("hardlinked tracked source is rejected",t=>{
 const f=fixture(t,{"a.md":"ordinary\n"});fs.linkSync(path.join(f.root,"a.md"),path.join(f.root,"alias.md"));
 f.git("add","alias.md");f.git("commit","-m","Synthetic unsafe hardlink");f.expected.head=f.git("rev-parse","HEAD");
 assert.throws(()=>f.collect({fragments:[{path:"a.md",startLine:1,endLine:1}]}),denied());
});
test("symlink directory cannot smuggle a tracked source beyond canonical root",t=>{
 const f=fixture(t,{"source/a.md":"ordinary\n"});
 fs.symlinkSync(path.join(f.root,"source"),path.join(f.root,"linked"),process.platform==="win32"?"junction":"dir");
 assert.throws(()=>f.collect({fragments:[{path:"linked/a.md",startLine:1,endLine:1}]}),denied());
});
