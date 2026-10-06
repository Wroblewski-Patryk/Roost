import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { prepareCodingTests, runCodingTests, pythonRuntimeInventory, qualifyPythonRuntimeObservation } from './agent-host-coding-tests.mjs';
import { nativeDigest, nativeRelative, physicalIdentity } from './agent-host-native-footprint.mjs';
import { normalizeGitRemote } from './agent-host-workspace-guard.mjs';
import { isWindowsJobCleanupReceipt, startWindowsJob, temporaryWindowsJobLauncher } from './agent-host-windows-job.mjs';

// Fixed verification of a retained candidate. The managed coding caller must
// authenticate its continuation; this module grants no readonly model tools.
// No checkout, restore, clone, commit or application source write.
const proofs = new WeakMap();
const receipts = new WeakMap();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = (phase) => { throw Object.assign(new Error('coding_test_replay_unproven'), { retryable: false,
  ...(typeof phase === 'string' && /^python_[a-z_]{1,60}$/.test(phase) ? { replayPhase: phase } : {}) }); };
export const codingReplayDiagnosticPhases=Object.freeze(['python_initial_pins','python_runtime_probe','python_runtime_observation','python_projection_prepare','python_projection_job','python_projection_report','python_candidate_green']);
export const codingReplayDiagnosticBoundaries=Object.freeze(['before_job','data_authority','data_consumer','poll_pins','poll_subset','job_completion','closed_check','post_job_pins','post_job_subset','phase_failure']);
const diagnosticReasons=new Set(['coding_test_replay_unproven','windows_job_output_rejected','hermes_stop_recovery_unproven',
 'greenlet_actual_replay_actual_stopped_process_inventory','greenlet_actual_replay_no_foreign_native_launcher','greenlet_actual_replay_core_owned_job_temp_parent',
 'greenlet_actual_replay_writer_recovery_absent','greenlet_actual_replay_actual_clean_candidate_direct_parent','greenlet_actual_replay_exact_four_changes',
 'greenlet_actual_replay_twelve_ui_and_migration_parity','greenlet_actual_replay_append_only_log','greenlet_actual_replay_actual_current_decision_revision',
 'greenlet_successor_replay_fresh_current_root_record','greenlet_successor_replay_actual_current_normal_completed_source','greenlet_coding_native_actual_fixed_sdk_cas',
 'native_root_invalid','native_root_unavailable','native_reparse_denied','native_inventory_limit','native_git_observation_failed','native_scope_invalid']);
const nativeTerminationReasons=new Set(['root_exit','timeout','cancel','lease_lost','context_stop','controller_shutdown','controller_closed','preparation_failed','request_invalid','startup_timeout','protocol_error','stdin_error','pipe_error','output_limit']);
// Diagnostic projection alone grants no receipt/native authority. Raw errors,
// channels, output, paths and callback details never cross this boundary.
export function codingReplayDiagnostic({phase,boundary,error,receipt}) {
 if(!codingReplayDiagnosticPhases.includes(phase)||!codingReplayDiagnosticBoundaries.includes(boundary))fail();
 const safe=receipt&&nativeTerminationReasons.has(receipt.terminationReason)
  &&(receipt.rootExit===null||Number.isSafeInteger(receipt.rootExit)&&receipt.rootExit>=0)
  &&['resumed','jobClosed','cleanup'].every(k=>typeof receipt[k]==='boolean')
  &&Number.isSafeInteger(receipt.activeProcesses)&&receipt.activeProcesses>=0;
 const r=safe?{terminationReason:receipt.terminationReason,rootExit:receipt.rootExit,resumed:receipt.resumed,jobClosed:receipt.jobClosed,
  cleanup:receipt.cleanup,activeProcesses:receipt.activeProcesses,receiptDigest:nativeDigest(receipt),
  cleanupReceiptQualified:isWindowsJobCleanupReceipt(receipt)}:null;
 return Object.freeze({schemaVersion:'roost-coding-replay-diagnostic-v1',phase,boundary,
  guardCode:diagnosticReasons.has(error?.message)?error.message:error?'unknown_guard':null,
  receipt:r,diagnosticOnly:true,retryAllowed:false});
}
// The returned value still requires the original branded cleanup predicates.
// This observation helper cannot qualify a JSON receipt or grant a retry.
export async function observeCodingReplayJobCompletion(completion,{phase,onDiagnostic,getProblem=()=>undefined,getCallbackProblem=()=>undefined}) {
 const emit=(error,receipt)=>{if(typeof onDiagnostic==='function'&&onDiagnostic(codingReplayDiagnostic({phase,boundary:'job_completion',error,receipt}))?.then)fail();};
 try{const receipt=await completion,problem=getProblem();emit(problem,receipt);if(problem)throw problem;return receipt;}
 catch(error){emit(getCallbackProblem()??getProblem()??error,error?.details?.ownedTreeReceipt);throw error;}
}
const inside = (root, value) => { const r = path.relative(root, value); return !!r && !r.startsWith('..') && !path.isAbsolute(r); };
const same = (a, b) => process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
const env = () => Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  /^(?:SYSTEMROOT|WINDIR|PATH|PATHEXT|COMSPEC|TEMP|TMP|USERPROFILE|HOME|APPDATA|LOCALAPPDATA)$/i.test(key)));
function git(root, args, binary = false) {
  return execFileSync('git', ['--no-replace-objects', '--literal-pathspecs', '-c', 'core.fsmonitor=false',
    '-c', 'core.untrackedCache=false', '-c', 'core.hooksPath=' + (process.platform === 'win32' ? 'NUL' : '/dev/null'), ...args], {
    cwd: root, shell: false, windowsHide: true, timeout: 10000, maxBuffer: 4 * 1024 * 1024,
    env: { ...env(), GIT_OPTIONAL_LOCKS: '0', GIT_NO_REPLACE_OBJECTS: '1', GIT_CONFIG_NOSYSTEM: '1',
      GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null', GIT_TERMINAL_PROMPT: '0' },
    ...(binary ? {} : { encoding: 'utf8' }), stdio: ['ignore', 'pipe', 'pipe'] });
}
function bytes(file, max = 4 * 1024 * 1024, dependency = false) {
  if (dependency) physicalIdentity(path.dirname(file)); else physicalIdentity(file, false);
  const a = lstatSync(file, { bigint: true });
  if (!a.isFile() || a.isSymbolicLink() || a.nlink < 1n || !dependency && a.nlink !== 1n
    || a.size > BigInt(max) || !same(realpathSync.native(file), file)) fail();
  const value = readFileSync(file), b = lstatSync(file, { bigint: true });
  if (BigInt(value.length) !== a.size || a.ino !== b.ino || a.dev !== b.dev || a.mtimeNs !== b.mtimeNs || a.nlink !== b.nlink) fail();
  return { value, digest: sha(value), identity: nativeDigest([file, String(a.dev), String(a.ino), String(a.nlink)]) };
}
const text = value => new TextDecoder('utf8', { fatal: true }).decode(value).replace(/\r\n/g, '\n');
export function isCodingTestReplayReceipt(value, expectedCandidate) {
  try {
    const proof = receipts.get(value);
    if (!proof || proof.candidate !== expectedCandidate || (value.candidateCommit ?? value.regressionReplay?.candidateCommit) !== expectedCandidate
      || performance.now() - proof.at < 0 || performance.now() - proof.at > 300000) return false;
    const { digest, ...body } = value;
    return digest === proof.digest && nativeDigest(body) === digest;
  } catch { return false; }
}
export function bindCodingTestReplayVerification(replay) {
  if (!isCodingTestReplayReceipt(replay, replay?.candidateCommit)) fail();
  const { green, digest: _digest, ...regressionReplay } = replay;
  const body = { ...green, regressionReplay };
  delete body.digest;
  const value = Object.freeze({ ...body, digest: nativeDigest(body) });
  receipts.set(value, { candidate: replay.candidateCommit, digest: value.digest, at: performance.now() });
  return value;
}
function trackedPin(root, relative, binary = false) {
  nativeRelative(relative);
  const filename = path.join(root, relative), pin = bytes(filename), committed = git(root, ['show', `HEAD:${relative}`], true);
  if (binary ? !pin.value.equals(committed) : text(pin.value) !== text(committed)) fail();
  return { filename, relative, digest: pin.digest, identity: pin.identity };
}
function snapshot(root) {
  const head = git(root, ['rev-parse', 'HEAD']).trim(), branch = git(root, ['symbolic-ref', '--short', 'HEAD']).trim();
  const status = git(root, ['status', '--porcelain=v1', '--untracked-files=all']);
  if (status) fail();
  return { head, branch, statusDigest: sha(status) };
}

// A nonzero process exit is insufficient: require a real failed assertion in
// the exact test, no skipped tests or suite/load errors, and meaningful counts.
export function classifyCodingReplayReport(report, exitCode, expectedFailure) {
  try {
    const c = [report.numTotalTests, report.numPassedTests, report.numFailedTests, report.numPendingTests];
    if (exitCode !== 1 || report.success !== false || !c.every(n => Number.isSafeInteger(n) && n >= 0)
      || c[0] < 1 || c[2] !== 1 || c[3] !== 0 || c[1] + c[2] !== c[0]
      || report.numRuntimeErrorTestSuites !== undefined && report.numRuntimeErrorTestSuites !== 0
      || !Array.isArray(report.testResults) || !report.testResults.length) fail();
    const assertions = report.testResults.flatMap(suite => {
      if (!Array.isArray(suite.assertionResults) || !suite.assertionResults.length
        || !['passed', 'failed'].includes(suite.status)
        || (suite.status === 'failed') !== suite.assertionResults.some(a => a.status === 'failed')) fail();
      return suite.assertionResults;
    });
    if (assertions.length !== c[0] || assertions.some(a => !['passed', 'failed'].includes(a.status))) fail();
    const failures = assertions.filter(a => a.status === 'failed');
    const failure = failures[0], messages = failure?.failureMessages;
    if (failures.length !== 1 || failure.fullName !== expectedFailure.fullName || !Array.isArray(messages)
      || messages.length !== 1 || typeof messages[0] !== 'string' || messages[0].length > 16384
      || !messages[0].includes('AssertionError:') || expectedFailure.messageIncludes.some(s => !messages[0].includes(s))) fail();
    return { totalTests: c[0], passedTests: c[1], failedTests: c[2], pendingTests: c[3],
      failedTestName: failure.fullName, assertionFailureDigest: sha(messages[0]) };
  } catch { fail(); }
}

/** Trusted unittest runner report, not a printed nonzero exit or import error. */
export function classifyPythonCodingReplayReport(report, exitCode, expectedFailure, projections) {
  try {
    if (JSON.stringify(Object.keys(report).sort()) !== JSON.stringify(['cases','errors','expectedFailures','failures','observedProjections','schemaVersion','skipped','testsRun','unexpectedSuccesses'])
        || report.schemaVersion !== 'roost-python-replay-report-v1' || exitCode !== 1
        || !Number.isSafeInteger(report.testsRun) || report.testsRun < 1 || report.failures !== 1 || report.errors !== 0
        || report.skipped !== 0 || report.expectedFailures !== 0 || report.unexpectedSuccesses !== 0
        || !Array.isArray(report.cases) || report.cases.length !== report.testsRun
        || new Set(report.cases.map(c => c.name)).size !== report.testsRun) fail();
    for (const c of report.cases) {
      if (JSON.stringify(Object.keys(c).sort()) !== JSON.stringify(c.status === 'passed' ? ['name','status'] : ['errorClass','message','name','status'])
          || typeof c.name !== 'string' || c.name.length > 1000 || !['passed','failed'].includes(c.status)) fail();
    }
    const failed = report.cases.filter(c => c.status === 'failed'), f = failed[0];
    if (failed.length !== 1 || f.name !== expectedFailure.fullName || f.errorClass !== 'AssertionError'
        || typeof f.message !== 'string' || !f.message.trim() || f.message.length > 16384
        || expectedFailure.messageIncludes.some(s => !f.message.includes(s))
        || !Array.isArray(report.observedProjections)
        || JSON.stringify(report.observedProjections) !== JSON.stringify(projections.map(p => ({relativePath:p.relativePath,sourceDigest:p.projectedSourceDigest})))) fail();
    return {totalTests:report.testsRun,passedTests:report.testsRun-1,failedTests:1,pendingTests:0,
      failedTestName:f.name,assertionFailureDigest:sha(f.message)};
  } catch { fail(); }
}

function preparePythonReplay(options, initial, manifestBytes, command) {
  const {repositoryPath:root,candidateCommit,baselineCommit,branch,projectionPaths,assetPaths=[],manifestPath,
    originUrl,acceptanceTests,temporaryParent,expectedFailure}=options;
  if (command.configurationPaths?.length !== 1 || projectionPaths.length !== 1 || projectionPaths[0] !== command.configurationPaths[0]
      || path.posix.basename(projectionPaths[0]) !== 'pyproject.toml'
      || !Array.isArray(command.sourcePaths) || JSON.stringify([...assetPaths].sort()) !== JSON.stringify([...command.sourcePaths].sort())
      || !/^__main__\.[A-Za-z_][A-Za-z0-9_]*\.test_[A-Za-z0-9_]+$/.test(expectedFailure.fullName)) fail();
  const testRelative=command.relativePath;
  const candidateProof=prepareCodingTests({manifestPath,repositoryPath:root,originUrl,acceptanceTests,writePaths:[testRelative]});
  const pins=[trackedPin(root,testRelative)], projections=projectionPaths.map(relative=>{
    nativeRelative(relative);const pin=trackedPin(root,relative), baseline=git(root,['show',`${baselineCommit}:${relative}`],true), source=text(baseline);
    if (!source.trim()||source.includes('\0')||baseline.length>131072||text(bytes(pin.filename).value)===source) fail();
    pins.push(pin);return {relativePath:relative,filename:pin.filename,baselineSource:source,baselineBlobDigest:sha(baseline),
      projectedSourceDigest:sha(source),candidateDigest:pin.digest};
  });
  for (const relative of assetPaths) {
    nativeRelative(relative);if(projectionPaths.includes(relative)||relative===testRelative)fail();
    const pin=trackedPin(root,relative),baseline=git(root,['show',`${baselineCommit}:${relative}`],true);
    if(text(baseline)!==text(bytes(pin.filename).value))fail();pins.push(pin);
  }
  const runtime={root:command.runtimeRoot,identity:physicalIdentity(command.runtimeRoot),executable:path.join(command.runtimeRoot,'python.exe'),
    executableIdentity:command.executableIdentity,executableDigest:command.executableDigest,version:command.pythonVersion,digest:command.runtimeDigest};
  const proof=Object.freeze({});proofs.set(proof,{python:true,root,candidateCommit,baselineCommit,branch,initial,temporaryParent,command,
    pins,projections,testRelative,assetPaths:[...assetPaths],manifestPath,manifestDigest:manifestBytes.digest,candidateProof,runtime,
    expectedFailure:structuredClone(expectedFailure),used:false});return proof;
}
function assertPythonReplayRuntime(p) {
  const r=p.runtime;if(physicalIdentity(r.root)!==r.identity||physicalIdentity(r.executable,false)!==r.executableIdentity
    ||bytes(r.executable,64*1024*1024).digest!==r.executableDigest||pythonRuntimeInventory(r.root).digest!==r.digest)fail();
}

// Fixed source; only exact sealed relative filenames/digests are serialized.
// Test code runs against an owned file subset, never an application checkout.
export function pythonReplayRunnerSource(options) {
  if(!options||JSON.stringify(Object.keys(options).sort())!==JSON.stringify(['projections','testRelative']))fail();
  const {testRelative,projections}=options;
  nativeRelative(testRelative);if(!/^test_[A-Za-z0-9_]+\.py$/.test(path.posix.basename(testRelative))||!Array.isArray(projections)||projections.length!==1)fail();
  const p=projections[0];nativeRelative(p.relativePath);
  if(JSON.stringify(Object.keys(p).sort())!==JSON.stringify(['projectedSourceDigest','relativePath'])
   ||path.posix.basename(p.relativePath)!=='pyproject.toml'||!/^[a-f0-9]{64}$/.test(p.projectedSourceDigest))fail();
  const spec=Buffer.from(JSON.stringify({testRelative,projections:projections.map(x=>({relativePath:x.relativePath,sourceDigest:x.projectedSourceDigest}))})).toString('base64');
  return `import base64,contextlib,hashlib,io,json,os,pathlib,runpy,stat,sys,unittest
SPEC=json.loads(base64.b64decode('${spec}'))
ROOT=pathlib.Path(__file__).resolve().parent
observed={}; active=False; busy=False; reports=[]
def audit(event,args):
 global busy
 if not active or busy or event!='open': return
 filename=args[0]
 if not isinstance(filename,(str,bytes,os.PathLike)): return
 resolved=pathlib.Path(os.fsdecode(filename)).resolve()
 for p in SPEC['projections']:
  target=ROOT.joinpath(p['relativePath'])
  if resolved!=target: continue
  mode=args[1]; flags=args[2]
  if (isinstance(mode,str) and (not mode.startswith('r') or '+' in mode)) or (flags & (os.O_WRONLY|os.O_RDWR|os.O_CREAT|os.O_TRUNC|os.O_APPEND)): raise RuntimeError('replay_projection_write_denied')
  busy=True
  try:
   info=os.lstat(target)
   if not stat.S_ISREG(info.st_mode) or info.st_nlink!=1 or target.resolve()!=target: raise RuntimeError('replay_projection_identity_unproven')
   if hashlib.sha256(target.read_bytes()).hexdigest()!=p['sourceDigest']: raise RuntimeError('replay_projection_bytes_unproven')
   observed[p['relativePath']]={'relativePath':p['relativePath'],'sourceDigest':p['sourceDigest']}
  finally: busy=False
class Result(unittest.TextTestResult):
 def __init__(self,*a,**k): super().__init__(*a,**k); self.cases=[]
 def addSuccess(self,test): super().addSuccess(test); self.cases.append({'name':test.id(),'status':'passed'})
 def addFailure(self,test,err):
  if err[0] is not AssertionError: raise RuntimeError('replay_assertion_class_unproven')
  super().addFailure(test,err); self.cases.append({'name':test.id(),'status':'failed','errorClass':err[0].__name__,'message':str(err[1])})
class Runner(unittest.TextTestRunner):
 resultclass=Result
 def run(self,suite):
  result=super().run(suite)
  report={'schemaVersion':'roost-python-replay-report-v1','testsRun':result.testsRun,'failures':len(result.failures),'errors':len(result.errors),'skipped':len(result.skipped),'expectedFailures':len(result.expectedFailures),'unexpectedSuccesses':len(result.unexpectedSuccesses),'cases':result.cases,'observedProjections':[observed[p['relativePath']] for p in SPEC['projections'] if p['relativePath'] in observed]}
  reports.append(report); return result
class CapturedStdout(io.TextIOBase):
 def __init__(self): super().__init__(); self.bytes=0; self.tail=''; self.marker_seen=False; self.limit_exceeded=False
 def write(self,value):
  if not isinstance(value,str): raise TypeError('replay_stdout_type_unproven')
  self.bytes+=len(value.encode('utf-8'))
  if self.bytes>65536: self.limit_exceeded=True; raise RuntimeError('replay_stdout_limit')
  joined=self.tail+value
  if 'ROOST_PYTHON_REPLAY_REPORT ' in joined: self.marker_seen=True
  self.tail=joined[-len('ROOST_PYTHON_REPLAY_REPORT '):]
  return len(value)
unittest.TextTestRunner=Runner
unittest.runner.TextTestRunner=Runner
sys.addaudithook(audit)
sys.argv=[str(ROOT.joinpath(SPEC['testRelative']))]
active=True
captured=CapturedStdout(); terminal_exit=None
with contextlib.redirect_stdout(captured):
 try: runpy.run_path(sys.argv[0],run_name='__main__')
 except SystemExit as ended:
  if type(ended.code) not in (int,bool): raise RuntimeError('replay_terminal_exit_unproven')
  terminal_exit=int(ended.code)
 finally: active=False
if len(reports)!=1 or captured.marker_seen or captured.limit_exceeded: raise RuntimeError('replay_runner_capture_unproven')
report=reports[0]
failed=[case for case in report['cases'] if case['status']=='failed']
if terminal_exit!=1 or report['testsRun']<1 or report['failures']!=1 or report['errors']!=0 or report['skipped']!=0 or report['expectedFailures']!=0 or report['unexpectedSuccesses']!=0 or len(failed)!=1 or failed[0]['errorClass']!='AssertionError' or len(report['cases'])!=report['testsRun'] or len(report['observedProjections'])!=len(SPEC['projections']): raise RuntimeError('replay_actual_assertion_terminal_unproven')
print('ROOST_PYTHON_REPLAY_REPORT '+json.dumps(report,separators=(',',':')),flush=True)
sys.exit(terminal_exit)
`;
}

export function prepareCodingTestReplay(options) {
  try {
    const { repositoryPath: root, candidateCommit, baselineCommit, branch, projectionPaths, assetPaths = [],
      manifestPath, originUrl, acceptanceTests, temporaryParent, expectedFailure } = options;
    if (!/^[a-f0-9]{40}$/.test(candidateCommit) || !/^[a-f0-9]{40}$/.test(baselineCommit)
      || typeof branch !== 'string' || !branch.startsWith('codex/') || !Array.isArray(projectionPaths)
      || projectionPaths.length < 1 || projectionPaths.length > 4 || new Set(projectionPaths).size !== projectionPaths.length
      || !Array.isArray(assetPaths) || assetPaths.length > 8 || new Set(assetPaths).size !== assetPaths.length
      || !expectedFailure || typeof expectedFailure.fullName !== 'string' || !expectedFailure.fullName.trim()
      || expectedFailure.fullName.length > 1000 || !Array.isArray(expectedFailure.messageIncludes)
      || expectedFailure.messageIncludes.length < 2 || expectedFailure.messageIncludes.length > 8
      || expectedFailure.messageIncludes.some(s => typeof s !== 'string' || !s.trim() || s.length > 1000)) fail();
    physicalIdentity(root); physicalIdentity(path.join(root, '.git')); physicalIdentity(temporaryParent);
    if (inside(root, temporaryParent) || same(root, temporaryParent)) fail();
    if (!same(path.resolve(git(root, ['rev-parse', '--show-toplevel']).trim()), root)
      || !same(path.resolve(root, git(root, ['rev-parse', '--git-common-dir']).trim()), path.join(root, '.git'))
      || normalizeGitRemote(git(root, ['remote', 'get-url', 'origin']).trim()) !== normalizeGitRemote(originUrl)) fail();
    const initial = snapshot(root);
    if (initial.head !== candidateCommit || initial.branch !== branch
      || git(root, ['rev-list', '--parents', '-n', '1', candidateCommit]).trim() !== `${candidateCommit} ${baselineCommit}`) fail();
    const manifestBytes = bytes(manifestPath, 16384), manifest = JSON.parse(manifestBytes.value);
    if (!Array.isArray(manifest.commands) || manifest.commands.length !== 1) fail();
    if(manifest.commands[0].kind==='python_unittest')return preparePythonReplay(options,initial,manifestBytes,manifest.commands[0]);
    if(manifest.commands[0].kind !== 'workspace_vitest')fail();
    const command = manifest.commands[0], testRelative = `${command.workspace}/${command.relativePath}`;
    const candidateProof = prepareCodingTests({ manifestPath, repositoryPath: root, originUrl, acceptanceTests, writePaths: [testRelative] });
    const pins = [trackedPin(root, 'package.json'), trackedPin(root, 'pnpm-lock.yaml'),
      trackedPin(root, `${command.workspace}/package.json`), trackedPin(root, testRelative)];
    const workspace = path.join(root, command.workspace);
    const names = ['vitest', 'vite'].flatMap(n => ['ts', 'mts', 'cts', 'js', 'mjs', 'cjs'].map(ext => `${n}.config.${ext}`));
    const configs = names.filter(n => existsSync(path.join(workspace, n)));
    // More than one config makes precedence ambiguous; reject instead of guessing.
    if (configs.length > 1) fail();
    for (const n of configs) pins.push(trackedPin(root, `${command.workspace}/${n}`));
    for (const n of ['tsconfig.json', 'vitest.setup.ts', 'vitest.setup.js', 'vitest.setup.mjs'])
      if (existsSync(path.join(workspace, n))) pins.push(trackedPin(root, `${command.workspace}/${n}`));
    const projections = projectionPaths.map(relative => {
      nativeRelative(relative);
      if (!relative.startsWith(`${command.workspace}/src/`) || !/\.(?:[cm]?[jt]s|[jt]sx)$/.test(relative)
        || /(?:\.test\.|\.spec\.|\.config\.)/.test(relative) || relative === testRelative) fail();
      const pin = trackedPin(root, relative); pins.push(pin);
      const baseline = git(root, ['show', `${baselineCommit}:${relative}`], true), source = text(baseline);
      if (!source.trim() || source.includes('\0') || baseline.length > 131072 || text(bytes(pin.filename).value) === source) fail();
      return { relativePath: relative, filename: pin.filename, baselineSource: source,
        baselineBlobDigest: sha(baseline), projectedSourceDigest: sha(source), candidateDigest: pin.digest };
    });
    for (const relative of assetPaths) {
      if (projectionPaths.includes(relative) || relative === testRelative) fail();
      const pin = trackedPin(root, relative, true);
      if (sha(git(root, ['show', `${baselineCommit}:${relative}`], true)) !== pin.digest) fail();
      pins.push(pin);
    }
    const installedRoot = realpathSync.native(path.join(workspace, 'node_modules', 'vitest'));
    const cli = path.join(installedRoot, 'vitest.mjs');
    for (const filename of [process.execPath, cli, path.join(installedRoot, 'package.json')]) {
      const p = bytes(filename, 128 * 1024 * 1024, true); pins.push({ filename, digest: p.digest, identity: p.identity, dependency: true });
    }
    const proof = Object.freeze({});
    proofs.set(proof, { root, candidateCommit, baselineCommit, branch, initial, temporaryParent, command, workspace, configs, names,
      cli, installedRoot, pins, projections, testRelative, assetPaths: [...assetPaths], manifestPath,
      manifestDigest: manifestBytes.digest, candidateProof, expectedFailure: structuredClone(expectedFailure), used: false });
    return proof;
  } catch { fail(); }
}
function assertPinned(p, assertAuthority) {
  if (typeof assertAuthority !== 'function' || assertAuthority()?.then) fail();
  if (JSON.stringify(snapshot(p.root)) !== JSON.stringify(p.initial) || bytes(p.manifestPath, 16384).digest !== p.manifestDigest
    || !p.python&&(realpathSync.native(path.join(p.workspace, 'node_modules', 'vitest')) !== p.installedRoot
    || JSON.stringify(p.names.filter(n => existsSync(path.join(p.workspace, n)))) !== JSON.stringify(p.configs))) fail();
  for (const pin of p.pins) {
    const actual = bytes(pin.filename, 128 * 1024 * 1024, pin.dependency);
    if (actual.identity !== pin.identity || actual.digest !== pin.digest) fail();
  }
  if(p.python)assertPythonReplayRuntime(p);
}
function configSource(p, directory, witnessPath) {
  const entries = p.projections.map(x => ({ filename: x.filename.replaceAll('\\', '/'), source: x.baselineSource,
    relativePath: x.relativePath, sourceDigest: x.projectedSourceDigest }));
  // Vite bundles this wrapper and the original tracked config in our private
  // directory. load returns Git bytes in memory; canonical module stays intact.
  return `${p.configs.length ? `import original from ${JSON.stringify(path.join(p.workspace, p.configs[0]).replaceAll('\\', '/'))};` : 'const original = {};'}
import { writeFileSync } from 'node:fs';
const entries = ${JSON.stringify(entries)}, observed = new Map();
export default async function(env) {
 const base = typeof original === 'function' ? await original(env) : await original;
 if (!base || typeof base !== 'object' || Array.isArray(base)) throw Error('replay_config_invalid');
 const plugin = { name: 'roost-pinned-baseline-replay', enforce: 'pre', load(id) {
  const canonical = id.split('?')[0].replaceAll('\\\\', '/');
  const entry = entries.find(x => x.filename.toLowerCase() === canonical.toLowerCase());
  if (!entry) return null;
  if (id.includes('?')) throw Error('replay_projection_query_denied');
  observed.set(entry.relativePath, {relativePath: entry.relativePath, sourceDigest: entry.sourceDigest});
  writeFileSync(${JSON.stringify(witnessPath)}, JSON.stringify([...observed.values()]));
  return entry.source;
 }};
 return {...base, root: ${JSON.stringify(p.workspace)}, cacheDir: ${JSON.stringify(path.join(directory, 'vite-cache'))},
  plugins: [plugin, ...(base.plugins || [])], test: {...(base.test || {}), cache: false}};
}
`;
}
function cleanupDirectory(directory, parent) {
  if (!same(path.dirname(directory), parent) || !path.basename(directory).startsWith('roost-test-replay-')) fail();
  physicalIdentity(directory); let count = 0;
  function check(current) {
    for (const name of readdirSync(current)) {
      const target = path.join(current, name), stat = lstatSync(target);
      if (++count > 1024 || !inside(directory, target) || stat.isSymbolicLink() || !stat.isFile() && !stat.isDirectory()) fail();
      if (stat.isDirectory()) check(target);
    }
  }
  check(directory); rmSync(directory, { recursive: true, force: false });
  if (existsSync(directory)) fail();
}
const pythonReplayProbe="import json,sys;print(json.dumps({'version':sys.version.split()[0],'executable':sys.executable,'prefix':sys.prefix,'basePrefix':sys.base_prefix,'paths':sys.path,'isolated':bool(sys.flags.isolated),'ignoreEnvironment':bool(sys.flags.ignore_environment),'bytecodeDisabled':bool(sys.flags.dont_write_bytecode),'safePath':bool(sys.flags.safe_path)},sort_keys=True))";
async function runPythonReplay(p,{workspaceSeal,remainingMs,assertAuthority,onDiagnostic}) {
 let directory, directoryIdentity, phase='python_initial_pins';
 const emit=(boundary,error,receipt)=>{if(onDiagnostic!==undefined){if(typeof onDiagnostic!=='function')fail();
  if(onDiagnostic(codingReplayDiagnostic({phase,boundary,error,receipt}))?.then)fail();}};
 try {
  assertPinned(p,assertAuthority);
  const probeChunks=[],probeOutput=createHash('sha256');let probeBytes=0;
  const job=async(argv,cwd,onData,verify)=>temporaryWindowsJobLauncher(async artifact=>{
   emit('before_job');
   assertPinned(p,assertAuthority);if(verify)verify();
   const duration=remainingMs();if(!Number.isFinite(duration)||duration<1)fail();
   let callbackProblem;
   const handle=await startWindowsJob(artifact,{executable:p.runtime.executable,argv,cwd,input:'',environment:env(),attempt:randomUUID(),
    durationMs:Math.floor(Math.min(duration,120000)),onData:(channel,chunk)=>{
     try{if(assertAuthority()?.then)fail();}catch(error){callbackProblem=error;emit('data_authority',error);throw error;}
     try{onData(channel,chunk);}catch(error){callbackProblem=error;emit('data_consumer',error);throw error;}}});
   let problem;const timer=setInterval(()=>{
    try{assertPinned(p,assertAuthority);}catch(error){problem=error;try{emit('poll_pins',error);}catch{}finally{handle.stop('lease_lost');}return;}
    try{if(verify)verify();}catch(error){problem=error;try{emit('poll_subset',error);}catch{}finally{handle.stop('lease_lost');}}
   },2000);
   try{return await observeCodingReplayJobCompletion(handle.completion,{phase,onDiagnostic,getProblem:()=>problem,getCallbackProblem:()=>callbackProblem});}
   finally{clearInterval(timer);}
  });
  const closed=(r)=>{emit('closed_check',undefined,r);if(!isWindowsJobCleanupReceipt(r)||!r.cleanup||!r.jobClosed||r.activeProcesses!==0
   ||r.terminationReason!=='root_exit'||r.resumed!==true||r.executableDigest!==p.runtime.executableDigest)fail();};
  phase='python_runtime_probe';
  const probe=await job(['-I','-B','-c',pythonReplayProbe],p.runtime.root,(channel,chunk)=>{
   probeBytes+=chunk.length;if(probeBytes>65536)fail();probeOutput.update(chunk);if(channel==='stdout')probeChunks.push(chunk);
  });closed(probe);if(probe.rootExit!==0)fail();assertPinned(p,assertAuthority);
  phase='python_runtime_observation';
  const runtimeObservation=qualifyPythonRuntimeObservation(probeChunks,p.runtime);
  phase='python_projection_prepare';
  directory=mkdtempSync(path.join(p.temporaryParent,'roost-test-replay-'));directoryIdentity=physicalIdentity(directory);
  const subset=[];
  for(const pin of p.pins){const relative=pin.relative;nativeRelative(relative);const projection=p.projections.find(x=>x.relativePath===relative);
   const data=projection?Buffer.from(projection.baselineSource,'utf8'):bytes(pin.filename).value,filename=path.join(directory,relative);
   if(!inside(directory,filename))fail();mkdirSync(path.dirname(filename),{recursive:true});physicalIdentity(path.dirname(filename));
   writeFileSync(filename,data,{flag:'wx'});subset.push({...bytes(filename),filename,relative});
  }
  const runner=path.join(directory,'roost_replay_runner.py');
  if(p.pins.some(pin=>pin.relative==='roost_replay_runner.py'))fail();
  writeFileSync(runner,pythonReplayRunnerSource({testRelative:p.testRelative,projections:p.projections.map(({relativePath,projectedSourceDigest})=>({relativePath,projectedSourceDigest}))}),{flag:'wx'});
  const runnerPin=bytes(runner);
  const verify=()=>{if(physicalIdentity(directory)!==directoryIdentity)fail();
   for(const pin of [...subset,{...runnerPin,filename:runner}]){const current=bytes(pin.filename);if(current.identity!==pin.identity||current.digest!==pin.digest)fail();}
  };
  verify();const output=createHash('sha256'),chunks=[];let outputBytes=0;
  phase='python_projection_job';
  const native=await job(['-I','-B',runner],directory,(channel,chunk)=>{outputBytes+=chunk.length;if(outputBytes>131072)fail();
   output.update(chunk);if(channel==='stdout')chunks.push(chunk);},verify);closed(native);
  emit('post_job_pins',undefined,native);assertPinned(p,assertAuthority);emit('post_job_subset',undefined,native);verify();
  phase='python_projection_report';
  const marker='ROOST_PYTHON_REPLAY_REPORT ', lines=Buffer.concat(chunks).toString('utf8').split(/\r?\n/).filter(line=>line.startsWith(marker));
  if(lines.length!==1)fail();const report=JSON.parse(lines[0].slice(marker.length));
  const counts=classifyPythonCodingReplayReport(report,native.rootExit,p.expectedFailure,p.projections);
  const red={phase:'baseline_projection',exitCode:native.rootExit,outputDigest:output.digest('hex'),outputBytes,testCounts:counts,
   jobDigest:nativeDigest(native),runtimeProbeJobDigest:nativeDigest(probe),runtimeObservationDigest:runtimeObservation.sourceDigest,
   projectionWitnessDigest:nativeDigest(report.observedProjections),subsetDigest:nativeDigest(subset.map(({relative,digest,identity})=>({relative,digest,identity}))),
   runnerDigest:runnerPin.digest,cleanup:{jobClosed:true,activeProcesses:0}};
  if(physicalIdentity(directory)!==directoryIdentity)fail();cleanupDirectory(directory,p.temporaryParent);directory=undefined;
  phase='python_candidate_green';
  assertPinned(p,assertAuthority);const green=await runCodingTests(p.candidateProof,{phase:'candidate',workspaceSeal,remainingMs,assertAuthority});
  assertPinned(p,assertAuthority);
  if(!green.passed||green.tests.length!==1||green.tests[0].testCounts?.pendingTests!==0||green.tests[0].testCounts?.failedTests!==0
   ||green.tests[0].testCounts?.totalTests!==counts.totalTests||green.tests[0].dependencyDigest!==p.runtime.digest||green.tests[0].isolatedRuntime!==true)fail();
  const result={schemaVersion:'roost-native-coding-test-replay-v1',claim:'fresh_baseline_projection_and_unchanged_candidate',
   candidateCommit:p.candidateCommit,baselineCommit:p.baselineCommit,branch:p.branch,manifestDigest:p.manifestDigest,workspaceSeal,testRelativePath:p.testRelative,
   testDigest:p.pins.find(x=>x.relative===p.testRelative).digest,
   modules:p.projections.map(({relativePath,baselineBlobDigest,projectedSourceDigest,candidateDigest})=>({relativePath,baselineBlobDigest,projectedSourceDigest,candidateDigest})),
   assetPins:p.assetPaths.map(relative=>({relativePath:relative,digest:p.pins.find(x=>x.relative===relative).digest})),
   pinnedInputsDigest:nativeDigest(p.pins.map(({filename,digest,identity})=>({filename,digest,identity}))),
   red,green,repositoryUnchanged:true,temporaryConfigurationRemoved:true,completedAt:new Date().toISOString()};
  const value=Object.freeze({...result,digest:nativeDigest(result)});receipts.set(value,{candidate:p.candidateCommit,digest:value.digest,at:performance.now()});return value;
 }catch(error){emit('phase_failure',error);fail(phase);}finally{if(directory){if(physicalIdentity(directory)!==directoryIdentity)fail();cleanupDirectory(directory,p.temporaryParent);}}
}
export async function runCodingTestReplay(proof, { workspaceSeal, remainingMs, assertAuthority,onDiagnostic }) {
  let directory, p;
  try {
    p = proofs.get(proof);
    if (!p || p.used || !/^[a-f0-9]{64}$/.test(workspaceSeal) || typeof remainingMs !== 'function') fail();
    p.used = true; assertPinned(p, assertAuthority);
    if(p.python)return await runPythonReplay(p,{workspaceSeal,remainingMs,assertAuthority,onDiagnostic});
    directory = mkdtempSync(path.join(p.temporaryParent, 'roost-test-replay-'));
    const config = path.join(directory, 'baseline.config.mjs'), witness = path.join(directory, 'projection-witness.json');
    writeFileSync(config, configSource(p, directory, witness), { flag: 'wx' });
    const configPin = bytes(config), output = createHash('sha256'), chunks = []; let outputBytes = 0;
    const native = await temporaryWindowsJobLauncher(async artifact => {
      assertPinned(p, assertAuthority);
      const duration = remainingMs(); if (!Number.isFinite(duration) || duration < 1) fail();
      const handle = await startWindowsJob(artifact, { executable: process.execPath,
        argv: [p.cli, 'run', p.command.relativePath, '--config', config, '--maxWorkers=1', '--fileParallelism=false',
          '--pool=forks', '--passWithNoTests=false', '--reporter=json'], cwd: p.workspace, input: '',
        environment: { ...env(), GIT_TERMINAL_PROMPT: '0', npm_config_ignore_scripts: 'true', npm_config_audit: 'false',
          npm_config_fund: 'false', npm_config_update_notifier: 'false' }, attempt: randomUUID(), durationMs: Math.floor(Math.min(duration, 120000)),
        onData: (channel, chunk) => { if (assertAuthority()?.then) fail(); outputBytes += chunk.length;
          if (outputBytes > 131072) fail(); output.update(chunk); if (channel === 'stdout') chunks.push(chunk); } });
      let problem;
      const timer = setInterval(() => { try { assertPinned(p, assertAuthority); } catch (e) { problem = e; handle.stop('lease_lost'); } }, 2000);
      try { const result = await handle.completion; if (problem) throw problem; return result; }
      finally { clearInterval(timer); }
    });
    if (!isWindowsJobCleanupReceipt(native) || !native.cleanup || !native.jobClosed || native.activeProcesses !== 0
      || native.terminationReason !== 'root_exit' || native.resumed !== true) fail();
    assertPinned(p, assertAuthority);
    if (bytes(config).identity !== configPin.identity || bytes(config).digest !== configPin.digest) fail();
    const observed = JSON.parse(bytes(witness, 16384).value);
    const expected = p.projections.map(x => ({ relativePath: x.relativePath, sourceDigest: x.projectedSourceDigest }));
    const sorted = rows => [...rows].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    if (!Array.isArray(observed) || JSON.stringify(sorted(observed)) !== JSON.stringify(sorted(expected))) fail();
    const report = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const counts = classifyCodingReplayReport(report, native.rootExit, p.expectedFailure);
    const red = { phase: 'baseline_projection', exitCode: native.rootExit, outputDigest: output.digest('hex'), outputBytes,
      testCounts: counts, jobDigest: nativeDigest(native), projectionWitnessDigest: nativeDigest(sorted(observed)),
      cleanup: { jobClosed: true, activeProcesses: 0 } };
    cleanupDirectory(directory, p.temporaryParent); directory = undefined;
    assertPinned(p, assertAuthority);
    const green = await runCodingTests(p.candidateProof, { phase: 'candidate', workspaceSeal, remainingMs, assertAuthority });
    assertPinned(p, assertAuthority);
    if (!green.passed || green.tests.length !== 1 || green.tests[0].testCounts?.pendingTests !== 0
      || green.tests[0].testCounts?.failedTests !== 0 || green.tests[0].testCounts?.totalTests !== counts.totalTests) fail();
    const result = { schemaVersion: 'roost-native-coding-test-replay-v1', claim: 'fresh_baseline_projection_and_unchanged_candidate',
      candidateCommit: p.candidateCommit, baselineCommit: p.baselineCommit, branch: p.branch,
      manifestDigest: p.manifestDigest, workspaceSeal, testRelativePath: p.testRelative,
      testDigest: p.pins.find(x => x.relative === p.testRelative).digest,
      modules: p.projections.map(({ relativePath, baselineBlobDigest, projectedSourceDigest, candidateDigest }) =>
        ({ relativePath, baselineBlobDigest, projectedSourceDigest, candidateDigest })),
      assetPins: p.assetPaths.map(relative => ({ relativePath: relative, digest: p.pins.find(x => x.relative === relative).digest })),
      pinnedInputsDigest: nativeDigest(p.pins.map(({ filename, digest, identity }) => ({ filename, digest, identity }))),
      red, green, repositoryUnchanged: true, temporaryConfigurationRemoved: true, completedAt: new Date().toISOString() };
    const value = Object.freeze({ ...result, digest: nativeDigest(result) });
    receipts.set(value, { candidate: p.candidateCommit, digest: value.digest, at: performance.now() });
    return value;
  } catch (error) { fail(error?.replayPhase); }
  finally { if (directory && p) cleanupDirectory(directory, p.temporaryParent); }
}
