// Owner-authorized manual Desktop policy only. Not a Roost provider admission.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {executableIdentity} from './hermes-manual-toolchain.mjs';
const scripts=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export function normalWindowsFolders(environment,systemRoot,programData) {
  // OpenSSH requires PROGRAMDATA even for a read-only version query.
  return {...environment,SystemDrive:path.parse(systemRoot).root.slice(0,2),PROGRAMDATA:fs.realpathSync.native(programData)};
}
export function readEffectivePath(powershell,environment) {
  return JSON.parse(execFileSync(powershell,['-NoProfile','-NonInteractive','-File',path.join(scripts,'hermes_manual_effective_path.ps1')],
    {env:environment,windowsHide:true,encoding:'utf8',timeout:15000,maxBuffer:65536,stdio:['ignore','pipe','pipe']}));
}
export function checkEffectiveResolution(snapshot,allowed,denied=[]) {
  if(typeof snapshot.path!=='string'||snapshot.path.length>32767||!Array.isArray(snapshot.commands))throw Error('effective_path_invalid');
  const expected=Object.keys(allowed).sort();
  if(JSON.stringify(snapshot.commands.map(c=>c.name).sort())!==JSON.stringify(expected))throw Error('effective_commands_missing');
  return snapshot.commands.map(c=>{
    if(c.type!=='Application'||!c.path||!allowed[c.name].some(p=>path.resolve(p).toLowerCase()===path.resolve(c.path).toLowerCase()))throw Error('effective_command_shadowed');
    return {name:c.name,command:c.name,...executableIdentity(c.path,denied)};
  });
}
export function sameEffectivePath(a,b) {
  const rows=x=>x.commands.map(c=>[c.name,c.type,c.path?.toLowerCase()]).sort((l,r)=>l[0].localeCompare(r[0]));
  return a.path===b.path&&JSON.stringify(rows(a))===JSON.stringify(rows(b));
}
export function manualNormalToolchain({powershell,environment,systemRoot,programFiles,userProfile,localAppData,pythonBase,denied}) {
  const git=path.join(programFiles,'Git'),system=path.join(systemRoot,'System32');
  const allowed={git:[path.join(git,'cmd/git.exe')],uv:[path.join(userProfile,'.local/bin/uv.exe'),path.join(localAppData,'hermes/bin/uv.exe')],
    ssh:[path.join(system,'OpenSSH/ssh.exe'),path.join(git,'usr/bin/ssh.exe')],cmd:[path.join(system,'cmd.exe')],powershell:[powershell]};
  const effective=readEffectivePath(powershell,environment);
  const executables=checkEffectiveResolution(effective,allowed,denied);
  for(const e of executables)e.versionArgs=['git','uv'].includes(e.name)?['--version']:e.name==='ssh'?['-V']:[];
  for(const [name,file,args] of [['git-core',path.join(git,'mingw64/bin/git.exe'),[]],
    ['git-remote-https',path.join(git,'mingw64/libexec/git-core/git-remote-https.exe'),[]],
    ['git-bundled-sh',path.join(git,'usr/bin/sh.exe'),['--version']],
    ['git-bundled-ssh',path.join(git,'usr/bin/ssh.exe'),['-V']],
    ['audit-python',path.join(pythonBase,'python.exe'),['-I','-S','-B','--version']]]) {
    executables.push({name,command:null,versionArgs:args,...executableIdentity(file,denied)});
  }
  return {executables,effective,environment:{...environment,PATH:effective.path}};
}
