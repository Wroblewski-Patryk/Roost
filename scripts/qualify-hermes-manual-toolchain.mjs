// Qualification only. Never runs the official installer, downloads or installs.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {executableIdentity,localToolCandidates,qualifiedEnvironment,analyzeSource,sourceAdmission,probeToolchain,assertToolchainNoOverlap} from './lib/hermes-manual-toolchain.mjs';
import {inventory,assertOwned} from './lib/hermes-manual-install.mjs';
import {execFileSync} from 'node:child_process';

const scripts=path.dirname(fileURLToPath(import.meta.url));
const ps=path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe');
const manifest=JSON.parse(fs.readFileSync(path.join(process.env.LOCALAPPDATA,'hermes/roost-worker-manifest.json'),'utf8'));
const protectedRoots=[manifest.roots[0].path,path.join(process.env.LOCALAPPDATA,'Roost/hermes-pilot')].map(p=>fs.realpathSync.native(p));
const before=protectedRoots.map(p=>inventory(p));
const systemState=()=>execFileSync(ps,['-NoProfile','-File',path.join(scripts,'hermes_manual_machine_state.ps1')],
  {windowsHide:true,encoding:'utf8',timeout:20000,env:{...process.env,PSModulePath:path.join(path.dirname(ps),'Modules')}}).trim();
const machineBefore=systemState();
const report={result:'BLOCKED',attemptStarted:false,stages:[],diagnosticRetained:false};
// This is a fresh private inspection scratch, not a runtime or install attempt.
const parent=fs.realpathSync.native(process.env.USERPROFILE);
const scratch=fs.mkdtempSync(path.join(parent,'.hermes-toolchain-'));
const identity=String(fs.statSync(scratch,{bigint:true}).ino);
try {
  const home=path.join(scratch,'home'),cache=path.join(scratch,'cache');
  for(const dir of [home,path.join(home,'Local'),path.join(home,'Roaming'),path.join(cache,'temp')])fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(home,'.gitconfig'),'',{flag:'wx'});
  const executables=localToolCandidates({systemRoot:process.env.SystemRoot,programFiles:process.env.ProgramFiles,
    userProfile:process.env.USERPROFILE,pythonBase:manifest.roots[1].path,denied:protectedRoots});
  assertToolchainNoOverlap(executables,before);
  report.toolchainNoManagedOverlap=true;
  const env=qualifiedEnvironment({systemRoot:process.env.SystemRoot,home,cache,executables});
  const source=path.join(process.env.LOCALAPPDATA,'hermes/bootstrap-cache/install-main.ps1');
  const analysis=analyzeSource(source,ps,env);
  report.source=sourceAdmission(analysis);
  report.sourceCommands={literal:[...new Set(analysis.commands.map(c=>c.name).filter(Boolean))].sort(),
    dynamic:[...new Set(analysis.commands.filter(c=>!c.name).map(c=>c.head))].sort(),
    pathWrites:analysis.pathWrites,processLaunches:analysis.processLaunches,sshCommands:analysis.sshCommands};
  report.excludedExistingVenvCommands=['schtasks','taskkill','Get-CimInstance'];
  const commands=report.sourceCommands.literal.filter(c=>!['git',...report.excludedExistingVenvCommands].includes(c));
  const probe=probeToolchain({powershell:ps,env,cwd:home,executables,commands});
  // Exact canonical paths are local inspection evidence only, never public docs.
  for(const row of [...probe.tools,...probe.modules]) {
    const checked=executableIdentity(row.path,protectedRoots);
    if(checked.sha256!==row.sha256)throw Error('probe_identity_changed');
  }
  report.probe=probe;
  report.reason=report.source.blockers[0]??'toolchain_runtime_admission_not_qualified';
} catch(error) {report.reason=/^[a-z_]+$/.test(error.message)?error.message:'toolchain_qualification_failed';}
finally {
  const after=protectedRoots.map(p=>inventory(p));
  report.managedUnchanged=before[0].digest===after[0].digest;
  report.profileUnchanged=before[1].digest===after[1].digest;
  report.machineStateUnchanged=machineBefore===systemState();
  report.protectedCounts=after.map(i=>({files:i.files,bytes:i.bytes}));
  assertOwned(scratch,identity);inventory(scratch,{hashes:false});
  fs.rmSync(scratch,{recursive:true});
  report.cleanup=!fs.existsSync(scratch);
  report.manualRootExists=fs.existsSync(path.join(parent,'HermesDesktopManual'));
  report.freeBytes=fs.statfsSync(parent).bavail*fs.statfsSync(parent).bsize;
  console.log(JSON.stringify(report));
}
