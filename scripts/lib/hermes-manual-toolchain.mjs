// Read-only qualification for the exact official source. No upstream execution.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {installerHash,sha256,within,assertNoOverlap} from './hermes-manual-install.mjs';

const scripts=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export function executableIdentity(file,denied=[]) {
  if(!path.isAbsolute(file)||!fs.existsSync(file))throw Error('tool_missing');
  const canonical=fs.realpathSync.native(file),s=fs.lstatSync(file);
  if(!s.isFile()||s.isSymbolicLink()||canonical.toLowerCase()!==path.resolve(file).toLowerCase()
    ||denied.some(root=>within(fs.realpathSync.native(root),canonical)))throw Error('tool_origin');
  return {path:canonical,sha256:sha256(fs.readFileSync(canonical))};
}
export function verifyExecutable(expected,denied=[]) {
  const current=executableIdentity(expected.path,denied);
  if(current.path!==expected.path||current.sha256!==expected.sha256)throw Error('tool_drift');
  return current;
}
export function assertToolchainNoOverlap(executables,protectedInventories) {
  const rows=executables.map(e=>{const s=fs.statSync(e.path,{bigint:true});return {fileId:`${s.dev}:${s.ino}`};});
  assertNoOverlap({rows},protectedInventories);
}
export function localToolCandidates({systemRoot,programFiles,userProfile,pythonBase,denied=[]}) {
  // Explicit installation locations only; no registry PATH, where.exe or aliases.
  const git=path.join(programFiles,'Git'),system=path.join(systemRoot,'System32');
  const specs=[
    ['git',path.join(git,'cmd/git.exe'),'git',['--version']],
    ['uv',path.join(userProfile,'.local/bin/uv.exe'),'uv',['--version']],
    ['ssh',path.join(git,'usr/bin/ssh.exe'),'ssh',['-V']],
    ['sh',path.join(git,'usr/bin/sh.exe'),'sh',['--version']],
    ['git-core',path.join(git,'mingw64/bin/git.exe'),null,[]],
    ['git-remote-https',path.join(git,'mingw64/libexec/git-core/git-remote-https.exe'),null,[]],
    ['powershell',path.join(system,'WindowsPowerShell/v1.0/powershell.exe'),'powershell',[]],
    ['cmd',path.join(system,'cmd.exe'),'cmd',[]],
    ['audit-python',path.join(pythonBase,'python.exe'),null,['-I','-S','-B','--version']]];
  return specs.map(([name,file,command,versionArgs])=>({name,command,versionArgs,...executableIdentity(file,denied)}));
}
export function qualifiedEnvironment({systemRoot,home,cache,executables}) {
  const system=path.join(systemRoot,'System32'),ps=path.join(system,'WindowsPowerShell/v1.0');
  const directories=[...new Set([...executables.filter(e=>e.command).map(e=>path.dirname(e.path)),system,ps])];
  return {SystemRoot:systemRoot,WINDIR:systemRoot,OS:'Windows_NT',PROCESSOR_ARCHITECTURE:'AMD64',
    COMSPEC:path.join(system,'cmd.exe'),PATH:directories.join(';'),PATHEXT:'.EXE',
    PSModulePath:path.join(ps,'Modules'),
    USERPROFILE:home,HOME:home,HOMEDRIVE:path.parse(home).root.slice(0,2),HOMEPATH:home.slice(2),
    LOCALAPPDATA:path.join(home,'Local'),APPDATA:path.join(home,'Roaming'),
    TEMP:path.join(cache,'temp'),TMP:path.join(cache,'temp'),HERMES_HOME:home,HERMES_DISABLE_LAZY_INSTALLS:'1',
    PYTHONDONTWRITEBYTECODE:'1',PYTHONNOUSERSITE:'1',PYTHONUTF8:'1',
    UV_CACHE_DIR:path.join(cache,'uv'),UV_LINK_MODE:'copy',UV_NO_CONFIG:'1',
    GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:path.join(home,'.gitconfig'),
    // Command-line -c survives upstream replacing GIT_CONFIG_COUNT.
    GIT_CONFIG_PARAMETERS:"'credential.helper=' 'core.askPass='",
    GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never',GIT_SSH_VARIANT:'ssh'};
}
export function analyzeSource(source,powershell,env) {
  if(sha256(fs.readFileSync(source))!==installerHash)throw Error('installer_identity');
  return JSON.parse(execFileSync(powershell,['-NoProfile','-NonInteractive','-File',
    path.join(scripts,'hermes_manual_source_commands.ps1'),'-Source',source],
    {env,windowsHide:true,encoding:'utf8',timeout:20000,maxBuffer:262144,stdio:['ignore','pipe','pipe']}));
}
export function sourceAdmission(analysis) {
  const blockers=[];
  if(analysis.pathWrites.length)blockers.push('installer_replaces_qualified_path');
  const dynamic=analysis.commands.filter(c=>!c.name).map(c=>c.head);
  const allowed=new Set(['$UvCmd','$resolvedPython.Path','$pythonExeForParse','$venvPython','$pythonExe','$Script','$StageDef.Worker']);
  if(dynamic.some(d=>!allowed.has(d)))blockers.push('unknown_dynamic_command');
  if(dynamic.some(d=>['$resolvedPython.Path','$pythonExeForParse','$venvPython','$pythonExe'].includes(d)))
    blockers.push('generated_python_not_prequalified');
  // This exact source permits uv sync / pip editable builds and unlocked tiers.
  // No claim of a closed transitive build-tool inventory is possible before install.
  if(analysis.functions.includes('Install-Dependencies'))blockers.push('dependency_build_closure_unqualified');
  if(analysis.processLaunches.some(p=>p.value.trim()!=='$UvCmd'))blockers.push('unknown_process_launch');
  return {result:blockers.length?'BLOCKED':'PASS',blockers};
}
export function assertQualifiedSource(analysis) {
  const result=sourceAdmission(analysis);
  if(result.blockers.length)throw Error(result.blockers[0]);
}
export function probeToolchain({powershell,env,cwd,executables,commands}) {
  for(const e of executables)verifyExecutable(e);
  return JSON.parse(execFileSync(powershell,['-NoProfile','-NonInteractive','-File',path.join(scripts,'hermes_manual_toolchain_probe.ps1')],
    {env,cwd,input:JSON.stringify({executables,commands,moduleRoot:env.PSModulePath}),windowsHide:true,encoding:'utf8',
      timeout:30000,maxBuffer:262144,stdio:['pipe','pipe','pipe']}));
}
