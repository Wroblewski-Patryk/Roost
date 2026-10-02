import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, linkSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { prepareCodingTests, runCodingTests } from './lib/agent-host-coding-tests.mjs';

const originUrl = 'https://example.invalid/pilot.git', workspace = 'apps/web', relativePath = 'src/app/manifest.test.ts';
const acceptanceTest = `pnpm --filter web exec vitest run ${relativePath}`;
function git(cwd,...args){return execFileSync('git',['-c','user.name=Fixture','-c','user.email=fixture@example.invalid',...args],{cwd,shell:false,windowsHide:true,encoding:'utf8'}).trim();}
function fixture(t,realVitest){
 const parent=realpathSync.native(os.tmpdir()),root=mkdtempSync(path.join(parent,'roost-workspace-vitest-')),junctions=[];
 t.after(()=>{
  const resolved=realpathSync.native(root);
  assert.equal(resolved,root);assert.equal(path.dirname(resolved),parent);assert.ok(path.basename(resolved).startsWith('roost-workspace-vitest-'));
  // Unlink dependency junctions themselves; shared dependency targets are never
  // recursive-delete targets and remain available to the installed application.
  for(const link of junctions){const relative=path.relative(root,link);assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));
   assert.equal(lstatSync(link).isSymbolicLink(),true);unlinkSync(link);}
  rmSync(resolved,{recursive:true,force:false});
 });
 const repositoryPath=path.join(root,'repository'),directory=path.join(repositoryPath,workspace),manifestPath=path.join(root,'tests.json');
 mkdirSync(path.join(directory,'src','app'),{recursive:true});mkdirSync(path.join(directory,'node_modules'),{recursive:true});
 const version=realVitest?JSON.parse(readFileSync(path.join(realVitest,'package.json'))).version:'4.1.5';
 writeFileSync(path.join(repositoryPath,'package.json'),JSON.stringify({name:'fixture-root',private:true}));
 writeFileSync(path.join(directory,'package.json'),JSON.stringify({name:'web',private:true,devDependencies:{vitest:`^${version}`}}));
 writeFileSync(path.join(repositoryPath,'pnpm-lock.yaml'),`lockfileVersion: '9.0'\n\nimporters:\n\n  apps/web:\n    devDependencies:\n      vitest:\n        specifier: ^${version}\n        version: ${version}\n`);
 const installed=path.join(directory,'node_modules','vitest');
 if(realVitest){
  cpSync(realVitest,installed,{recursive:true,dereference:true});
  const pkg=JSON.parse(readFileSync(path.join(realVitest,'package.json'))),parent=path.dirname(realVitest);
  for(const name of Object.keys(pkg.dependencies??{})){
   const source=realpathSync.native(path.join(parent,name)),destination=path.join(directory,'node_modules',name);
   mkdirSync(path.dirname(destination),{recursive:true});symlinkSync(source,destination,'junction');junctions.push(destination);
  }
 }else{
  mkdirSync(installed);writeFileSync(path.join(installed,'package.json'),JSON.stringify({name:'vitest',version,bin:{vitest:'./vitest.mjs'}}));
  writeFileSync(path.join(installed,'vitest.mjs'),'// Preparation-only fixture; never executed.\n');
 }
 writeFileSync(path.join(repositoryPath,'.gitignore'),'node_modules/\n');git(repositoryPath,'init','-b','codex/fixture');
 git(repositoryPath,'add','--','.gitignore','package.json','pnpm-lock.yaml',`${workspace}/package.json`);git(repositoryPath,'commit','-m','Fixture baseline');
 const command={kind:'workspace_vitest',workspace,packageName:'web',version,relativePath,acceptanceTest};
 const manifest={schemaVersion:'roost-gate2-test-manifest-v1',repositoryOrigin:originUrl,commands:[command]};
 const save=()=>writeFileSync(manifestPath,JSON.stringify(manifest));save();
 const args={manifestPath,repositoryPath,originUrl,acceptanceTests:[acceptanceTest],writePaths:[`${workspace}/${relativePath}`]};
 return{root,repositoryPath,directory,manifestPath,manifest,command,args,save,installed,junctions,
  testFile:path.join(directory,relativePath),prepare:()=>prepareCodingTests(args)};
}
const run=proof=>runCodingTests(proof,{phase:'candidate',workspaceSeal:'a'.repeat(64),remainingMs:()=>45000,assertAuthority:()=>{}});

test('new focused test may be absent at preparation only with exact task write scope',t=>{
 const f=fixture(t);assert.ok(f.prepare());assert.equal(existsSync(f.testFile),false);
 for(const writePaths of [undefined,[],['apps/other/src/app/manifest.test.ts'],['apps/web/src/app/*']])
  assert.throws(()=>prepareCodingTests({...f.args,writePaths}),/coding_tests_unproven/);
});

test('wrong workspace, acceptance label, package version, command arguments and traversal are refused',t=>{
 const f=fixture(t);
 for(const change of [{workspace:'apps/other'},{workspace:'apps/web/../../outside'},{relativePath:'../outside.test.ts'},
  {relativePath:'--config.test.ts'},{acceptanceTest:acceptanceTest+' --watch'},{packageName:'api'},{version:'3.2.4'},
  {arguments:['--watch']},{executable:'other.exe'}]){
  f.manifest.commands=[{...f.command,...change}];f.save();assert.throws(f.prepare,/coding_tests_unproven/);
 }
});

test('tracked workspace package and lock must be unchanged and exact importer must match',t=>{
 const f=fixture(t);writeFileSync(path.join(f.repositoryPath,'pnpm-lock.yaml'),"lockfileVersion: '9.0'\nimporters:\n  apps/other:\n");
 assert.throws(f.prepare,/coding_tests_unproven/);
 git(f.repositoryPath,'checkout','--','pnpm-lock.yaml');
 writeFileSync(path.join(f.directory,'package.json'),JSON.stringify({name:'web',devDependencies:{vitest:'^3.2.4'}}));
 assert.throws(f.prepare,/coding_tests_unproven/);
});

test('binary CLI, wrong installed package and dependency escape cannot authorize an executable',t=>{
 const f=fixture(t),pkgFile=path.join(f.installed,'package.json'),cliFile=path.join(f.installed,'vitest.mjs');
 const original=readFileSync(pkgFile);writeFileSync(pkgFile,JSON.stringify({name:'other',version:'4.1.5',bin:{vitest:'./vitest.mjs'}}));
 assert.throws(f.prepare,/coding_tests_unproven/);writeFileSync(pkgFile,original);
 writeFileSync(cliFile,Buffer.from([0,255,0,13]));assert.throws(f.prepare,/coding_tests_unproven/);
 const outside=path.join(f.root,'outside');mkdirSync(outside);writeFileSync(path.join(outside,'package.json'),original);
 writeFileSync(path.join(outside,'vitest.mjs'),'// fixture');
 assert.equal(realpathSync.native(f.installed),f.installed);assert.ok(path.relative(f.root,f.installed).startsWith('repository'+path.sep));
 rmSync(f.installed,{recursive:true,force:false});symlinkSync(outside,f.installed,'junction');f.junctions.push(f.installed);
 assert.throws(f.prepare,/coding_tests_unproven/);
});

test('pnpm installed hardlinks are read-only pinned and changes through aliases block launch',async t=>{
 const f=fixture(t),cli=path.join(f.installed,'vitest.mjs'),alias=path.join(f.root,'store-cli.mjs');linkSync(cli,alias);
 assert.equal(lstatSync(cli).nlink,2);const proof=f.prepare();writeFileSync(f.testFile,'export {};\n');
 writeFileSync(alias,'// changed through store alias');await assert.rejects(run(proof),/coding_tests_unproven/);
});

test('manifest, lock, package, CLI and newly introduced config drift block candidate before launch',async t=>{
 for(const kind of ['manifest','lock','package','cli','config','binarytest']){
  const f=fixture(t),proof=f.prepare();writeFileSync(f.testFile,'export {};\n');
  if(kind==='manifest')writeFileSync(f.manifestPath,'{}');
  if(kind==='lock')writeFileSync(path.join(f.repositoryPath,'pnpm-lock.yaml'),'changed');
  if(kind==='package')writeFileSync(path.join(f.directory,'package.json'),'{}');
  if(kind==='cli')writeFileSync(path.join(f.installed,'vitest.mjs'),'// changed');
  if(kind==='config')writeFileSync(path.join(f.directory,'vitest.config.ts'),'export default {};');
  if(kind==='binarytest')writeFileSync(f.testFile,Buffer.from([0,255]));
  await assert.rejects(run(proof),/coding_tests_unproven/);
 }
});

const nativeRoot=process.env.ROOST_TEST_VITEST_ROOT;
test('native Windows Job runs real installed Vitest on only the focused workspace test and closes descendants',
 {skip:process.platform!=='win32'||!nativeRoot,timeout:120000},async t=>{
 const installed=realpathSync.native(nativeRoot),pkg=JSON.parse(readFileSync(path.join(installed,'package.json')));
 assert.equal(pkg.name,'vitest');const f=fixture(t,installed),proof=f.prepare();
 writeFileSync(f.testFile,"import { test, expect } from 'vitest'; test('focused fixture', () => { expect(2 + 2).toBe(4); expect(process.env.OPENAI_API_KEY).toBeUndefined(); });\n");
 const result=await run(proof);assert.equal(result.passed,true);assert.equal(result.tests.length,1);
 assert.equal(result.tests[0].kind,'workspace_vitest');assert.equal(result.tests[0].acceptanceTest,acceptanceTest);
 assert.equal(result.tests[0].exitCode,0);assert.match(result.tests[0].outputDigest,/^[a-f0-9]{64}$/);
 assert.deepEqual(result.tests[0].testCounts,{totalTests:1,passedTests:1,failedTests:0,pendingTests:0});
 assert.match(result.tests[0].jobDigest,/^[a-f0-9]{64}$/);assert.equal('output' in result.tests[0],false);
 await assert.rejects(run(proof),/coding_tests_unproven/);
 const skipped=f.prepare();writeFileSync(f.testFile,"import { test } from 'vitest'; test.skip('skipped fixture', () => {});\n");
 await assert.rejects(run(skipped),/coding_tests_unproven/);
 const config=path.join(f.directory,'vitest.config.mjs');writeFileSync(config,'export default {};\n');
 git(f.repositoryPath,'add','--',`${workspace}/vitest.config.mjs`);git(f.repositoryPath,'commit','-m','Pin fixture Vitest configuration');
 const configProof=f.prepare();writeFileSync(f.testFile,
  "import { test, expect } from 'vitest'; import { writeFileSync } from 'node:fs'; test('changes pinned config', () => { writeFileSync("+
  JSON.stringify(config)+", '// changed during passing test'); expect(1).toBe(1); });\n");
 await assert.rejects(run(configProof),/coding_tests_unproven/);
 assert.equal(readFileSync(config,'utf8'),'// changed during passing test');
});
