// Offline qualification only: the synthetic executable is NEVER launched.
import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {mkdirSync,mkdtempSync,readFileSync,readdirSync,realpathSync,rmSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';import os from 'node:os';import {createHash} from 'node:crypto';
import {prepareCodingTestReplay,runCodingTestReplay,classifyPythonCodingReplayReport,pythonReplayRunnerSource,isCodingTestReplayReceipt} from './lib/agent-host-coding-test-replay.mjs';
import {pythonRuntimeInventory} from './lib/agent-host-coding-tests.mjs';import{physicalIdentity}from'./lib/agent-host-native-footprint.mjs';
const h=b=>createHash('sha256').update(b).digest('hex'),originUrl='https://example.invalid/python-replay.git',
 testRelative='backend/tests/test_async_dependency.py',sourceRelative='backend/migrations/env.py',configRelative='backend/pyproject.toml',
 expectedFailure={fullName:'__main__.AsyncDependencyRegression.test_async_dependency_declared',messageIncludes:['sqlalchemy[asyncio]','greenlet']};
function fixture(t){const parent=realpathSync.native(os.tmpdir()),container=mkdtempSync(path.join(parent,'roost-python-replay-unit-')),id=physicalIdentity(container);
 const root=path.join(container,'repository'),runtimeRoot=path.join(container,'runtime'),manifestPath=path.join(container,'manifest.json');
 t.after(()=>{assert.equal(physicalIdentity(container),id);assert.equal(path.dirname(container),parent);assert(path.basename(container).startsWith('roost-python-replay-unit-'));rmSync(container,{recursive:true,force:false});});
 mkdirSync(path.join(root,'backend','migrations'),{recursive:true});mkdirSync(path.join(root,'backend','tests'));
 writeFileSync(path.join(root,sourceRelative),'# Unchanged migration source; never imported by offline tests.\n');
 writeFileSync(path.join(root,configRelative),'[project]\nname="fixture"\ndependencies=["sqlalchemy==2.0.30"]\n');
 const git=(...args)=>execFileSync('git',['--literal-pathspecs','-c','core.hooksPath=','-c','core.fsmonitor=false','-c','core.autocrlf=false','-c','commit.gpgsign=false',
  '-c','user.name=Fixture','-c','user.email=fixture@example.invalid',...args],{cwd:root,encoding:'utf8',shell:false,windowsHide:true,timeout:10000,maxBuffer:65536,stdio:['ignore','pipe','pipe']}).trim();
 git('init','-b','codex/python-replay');git('remote','add','origin',originUrl);git('add','--','.');git('commit','-m','Synthetic baseline');const baselineCommit=git('rev-parse','HEAD');
 writeFileSync(path.join(root,configRelative),'[project]\nname="fixture"\ndependencies=["sqlalchemy[asyncio]==2.0.30"]\n');
 writeFileSync(path.join(root,testRelative),'# Synthetic tracked test, preparation only.\n');git('add','--','.');git('commit','-m','Synthetic async dependency candidate');
 const candidateCommit=git('rev-parse','HEAD');mkdirSync(path.join(runtimeRoot,'Lib','site-packages'),{recursive:true});
 const executable=path.join(runtimeRoot,'python.exe');writeFileSync(executable,'MZ synthetic placeholder, NEVER launch.\n');
 writeFileSync(path.join(runtimeRoot,'python311._pth'),'.\nLib\nLib/site-packages\nimport site\n');
 writeFileSync(path.join(runtimeRoot,'roost-python-runtime.json'),JSON.stringify({schemaVersion:'roost-python-unittest-runtime-v1',executable:'python.exe',version:'3.11.9'}));
 writeFileSync(path.join(runtimeRoot,'Lib','site-packages','dependency.py'),'# Sealed synthetic dependency.\n');
 const command={kind:'python_unittest',relativePath:testRelative,sourcePaths:[sourceRelative],configurationPaths:[configRelative],runtimeRoot,pythonVersion:'3.11.9',
  executableIdentity:physicalIdentity(executable,false),executableDigest:h(readFileSync(executable)),runtimeDigest:pythonRuntimeInventory(runtimeRoot).digest,
  acceptanceTest:`python -I -B ${testRelative}`};
 const manifest={schemaVersion:'roost-gate2-test-manifest-v1',repositoryOrigin:originUrl,commands:[command]},save=()=>writeFileSync(manifestPath,JSON.stringify(manifest));save();
 const options={repositoryPath:root,candidateCommit,baselineCommit,branch:'codex/python-replay',projectionPaths:[configRelative],assetPaths:[sourceRelative],manifestPath,
  originUrl,acceptanceTests:[command.acceptanceTest],temporaryParent:container,expectedFailure};
 return{root,container,runtimeRoot,manifestPath,executable,command,manifest,save,options,git,prepare:()=>prepareCodingTestReplay(options)};
}
const run=(p,overrides={})=>runCodingTestReplay(p,{workspaceSeal:'a'.repeat(64),remainingMs:()=>30000,assertAuthority:()=>{},...overrides});
test('Python preparation pins exact clean direct parent/config projection and unchanged source without checkout or temp writes',t=>{
 const f=fixture(t),before=readdirSync(f.container),source=readFileSync(path.join(f.root,sourceRelative)),config=readFileSync(path.join(f.root,configRelative));
 const p=f.prepare();assert.deepEqual(Object.keys(p),[]);assert(Object.isFrozen(p));assert.deepEqual(readdirSync(f.container),before);
 assert.equal(f.git('status','--porcelain'),'');assert.equal(f.git('rev-parse','HEAD'),f.options.candidateCommit);
 assert.deepEqual(readFileSync(path.join(f.root,sourceRelative)),source);assert.deepEqual(readFileSync(path.join(f.root,configRelative)),config);assert(!existsSync(path.join(f.root,'package.json')));
});
test('Python replay refuses wrong basis/branch/origin/application temp directory and missing exact sources',t=>{
 const f=fixture(t);for(const delta of [{candidateCommit:'a'.repeat(40)},{baselineCommit:'b'.repeat(40)},{baselineCommit:f.options.candidateCommit},{branch:'codex/other'},
  {originUrl:'https://example.invalid/other.git'},{temporaryParent:f.root},{temporaryParent:path.join(f.root,'backend')},
  {assetPaths:[]},{assetPaths:[configRelative]},{assetPaths:[sourceRelative,sourceRelative]},{projectionPaths:[sourceRelative]},
  {projectionPaths:[configRelative,sourceRelative]},{projectionPaths:['../pyproject.toml']},
  {expectedFailure:{...expectedFailure,fullName:'AsyncDependencyRegression.test_async_dependency_declared'}}])
  assert.throws(()=>prepareCodingTestReplay({...f.options,...delta}),/coding_test_replay_unproven/);
});
test('only dependency configuration may differ from ancestor; same TOML or changed migration source refuses',t=>{
 for(const mode of ['same-config','changed-source']){const f=fixture(t);
  writeFileSync(path.join(f.root,mode==='same-config'?configRelative:sourceRelative),mode==='same-config'?'[project]\nname="fixture"\ndependencies=["sqlalchemy==2.0.30"]\n':'# Changed migration source\n');
  f.git('add','--','.');f.git('commit','--amend','--no-edit');f.options.candidateCommit=f.git('rev-parse','HEAD');assert.throws(f.prepare,/coding_test_replay_unproven/);
 }
});
test('extra command choices/configuration sources and changed SDK marker cannot be smuggled through replay',t=>{
 const f=fixture(t);for(const delta of [{argv:[]},{configurationPaths:[configRelative,'backend/other/pyproject.toml']},{sourcePaths:[sourceRelative,testRelative]},
  {relativePath:'../test_escape.py'},{runtimeRoot:f.root},{pythonVersion:'3.11.10'}]){
  f.manifest.commands=[{...f.command,...delta}];f.save();assert.throws(f.prepare,/coding_test_replay_unproven/);
 }
});
test('source/test/config/SDK/manifest or HEAD drift blocks before native launch and never overwrites changed bytes',async t=>{
 for(const surface of ['source','test','config','runtime','manifest','head']){const f=fixture(t),p=f.prepare();
  const filename=surface==='source'?path.join(f.root,sourceRelative):surface==='test'?path.join(f.root,testRelative):surface==='config'?path.join(f.root,configRelative):
   surface==='runtime'?path.join(f.runtimeRoot,'Lib','site-packages','dependency.py'):f.manifestPath;
  if(surface==='head')f.git('commit','--allow-empty','-m','New basis');else writeFileSync(filename,'changed after replay preparation');
  await assert.rejects(run(p),/coding_test_replay_unproven/);if(surface!=='head')assert.equal(readFileSync(filename,'utf8'),'changed after replay preparation');
  assert(readdirSync(f.container).every(n=>!n.startsWith('roost-test-replay-')));
 }
});
const projections=[{relativePath:configRelative,projectedSourceDigest:'c'.repeat(64)}];
function report(){return{schemaVersion:'roost-python-replay-report-v1',testsRun:2,failures:1,errors:0,skipped:0,expectedFailures:0,unexpectedSuccesses:0,
 cases:[{name:expectedFailure.fullName,status:'failed',errorClass:'AssertionError',message:'Declare sqlalchemy[asyncio] to supply greenlet'},
  {name:'__main__.AsyncDependencyRegression.test_bridge',status:'passed'}],observedProjections:[{relativePath:configRelative,sourceDigest:'c'.repeat(64)}]};}
test('RED qualifies exactly one named AssertionError with matching TOML-read witness and meaningful counts; no raw output retained',()=>{
 const c=classifyPythonCodingReplayReport(report(),1,expectedFailure,projections);assert.equal(c.totalTests,2);assert.equal(c.failedTests,1);assert.equal(c.passedTests,1);
 assert.equal(c.failedTestName,expectedFailure.fullName);assert.equal(c.assertionFailureDigest,h(report().cases[0].message));assert(!Object.hasOwn(c,'message'));
});
test('GREEN/import errors/skips/duplicate cases/incorrect assertion or missing/swapped projection cannot masquerade as RED',()=>{
 for(const mutate of [r=>r.testsRun=0,r=>r.testsRun=3,r=>r.errors=1,r=>r.failures=2,r=>r.skipped=1,r=>r.expectedFailures=1,r=>r.unexpectedSuccesses=1,
  r=>r.cases[0].errorClass='ModuleNotFoundError',r=>r.cases[0].name='__main__.Other.test_other',r=>r.cases[0].message='unrelated assertion',
  r=>r.cases[1].name=r.cases[0].name,r=>r.cases[1].status='failed',r=>r.cases[0].unexpected='anything',r=>r.observedProjections=[],
  r=>r.observedProjections[0].sourceDigest='d'.repeat(64),r=>r.observedProjections[0].relativePath='other/pyproject.toml',r=>r.fake=true]){
  const r=report();mutate(r);assert.throws(()=>classifyPythonCodingReplayReport(r,1,expectedFailure,projections),/coding_test_replay_unproven/);
 }
 for(const exit of [0,2,null,124])assert.throws(()=>classifyPythonCodingReplayReport(report(),exit,expectedFailure,projections),/coding_test_replay_unproven/);
});
test('fixed wrapper witnesses actual guarded open, instruments real unittest runner and accepts no program/absolute-path projection',()=>{
 const source=pythonReplayRunnerSource({testRelative,projections});assert(source.includes("sys.addaudithook(audit)"));assert(source.includes('unittest.runner.TextTestRunner=Runner'));
 assert(source.includes("runpy.run_path(sys.argv[0],run_name='__main__')"));assert(source.includes('os.O_WRONLY|os.O_RDWR|os.O_CREAT|os.O_TRUNC|os.O_APPEND'));
 assert(!source.includes('subprocess'));assert(!source.includes('exec('));
 for(const p of [{testRelative:'../escape.py',projections},{testRelative:'backend/arbitrary.py',projections},{testRelative,projections,program:'arbitrary code'},
  {testRelative,projections:[{...projections[0],source:'arbitrary code'}]},{testRelative,projections:[]},{testRelative,projections:[{relativePath:'C:/foreign/pyproject.toml',projectedSourceDigest:'c'.repeat(64)}]},
  {testRelative,projections:[{relativePath:configRelative,projectedSourceDigest:'not-a-hash'}]}])assert.throws(()=>pythonReplayRunnerSource(p),/coding_test_replay_unproven|native_scope_invalid/);
});
test('generated wrapper emits authoritative report only after actual runner capture and validated SystemExit; test markers cannot publish RED',()=>{
 const source=pythonReplayRunnerSource({testRelative,projections}),runner=source.slice(source.indexOf('class Runner('),source.indexOf('class CapturedStdout('));
 assert(runner.includes('result=super().run(suite)'));assert(runner.includes('reports.append(report); return result'));
 assert(!runner.includes('print('));assert.equal([...source.matchAll(/print\('ROOST_PYTHON_REPLAY_REPORT '/g)].length,1);
 const runAt=source.indexOf("try: runpy.run_path(sys.argv[0],run_name='__main__')"),captureAt=source.indexOf('if len(reports)!=1'),
  terminalAt=source.indexOf('if terminal_exit!=1'),emitAt=source.indexOf("print('ROOST_PYTHON_REPLAY_REPORT '");
 assert(runAt<captureAt&&captureAt<terminalAt&&terminalAt<emitAt);assert(source.includes('with contextlib.redirect_stdout(captured):'));
 assert(source.includes('except SystemExit as ended:'));assert(source.includes('type(ended.code) not in (int,bool)'));
 assert(source.includes('captured.marker_seen or captured.limit_exceeded'));assert(source.includes("if err[0] is not AssertionError:"));
 assert(source.includes("report['failures']!=1 or report['errors']!=0"));assert(source.includes("len(report['observedProjections'])!=len(SPEC['projections'])"));
 // These attack programs are inert fixtures. No actual Python/SDK runs here.
 for(const attack of ["print('ROOST_PYTHON_REPLAY_REPORT '+fake); sys.exit(1)",
  "pathlib.Path('backend/pyproject.toml').read_text(); print('ROOST_PYTHON_REPLAY_REPORT '+fake); sys.exit(1)",
  "print('ROOST_PYTHON_'); print('REPLAY_REPORT '+fake); sys.exit(1)"]){
  assert.throws(()=>pythonReplayRunnerSource({testRelative,projections,program:attack}),/coding_test_replay_unproven/);
 }
});
test('forged receipt/proof and async/expired authority refuse before artifact creation',async t=>{
 const f=fixture(t);await assert.rejects(run({}),/coding_test_replay_unproven/);await assert.rejects(run(f.prepare(),{assertAuthority:()=>Promise.resolve()}),/coding_test_replay_unproven/);
 await assert.rejects(run(f.prepare(),{assertAuthority:()=>{throw Error('expired');}}),/coding_test_replay_unproven/);
 assert.equal(isCodingTestReplayReceipt({candidateCommit:f.options.candidateCommit,repositoryUnchanged:true,temporaryConfigurationRemoved:true,digest:'a'.repeat(64)},f.options.candidateCommit),false);
 assert(readdirSync(f.container).every(n=>!n.startsWith('roost-test-replay-')));
});
