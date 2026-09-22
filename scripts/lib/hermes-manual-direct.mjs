// Direct stage results are exit/status + filesystem evidence, never log framing.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {sourcePin,stages,sha256,within} from './hermes-manual-install.mjs';

export const sourceTree='971ce7f3edcdbb0ebed9a1a433493eda2e51d3d7';
export function summarizeLog(bytes) {
  // Classifications only. No exception text, URLs, paths or raw lines escape.
  const text=bytes.toString('utf8');
  const patterns={powershell_parameter:/cannot bind|parameter cannot|missing an argument|parameter name/i,
    command_unavailable:/not recognized as the name|command not found/i,
    ssh_authentication:/permission denied \(publickey|host key verification failed/i,
    dns_failure:/could not resolve|name resolution|no such host/i,
    tls_failure:/certificate verify failed|certificate chain|SSL certificate/i,
    network_failure:/connection refused|connection timed out|failed to connect|HTTP (?:403|404|429|500|502|503)/i,
    dependency_resolution:/no solution found|no matching distribution|failed to resolve/i,
    python_unavailable:/managed Python is unavailable|Failed to install Python/i,
    access_denied:/access is denied|permissionerror|unauthorizedaccess/i,
    disk_full:/not enough space|no space left/i};
  const hosts=['github.com','codeload.github.com','raw.githubusercontent.com','astral.sh','pypi.org','files.pythonhosted.org'];
  return {bytes:bytes.length,sha256:sha256(bytes),classifications:Object.entries(patterns).filter(([,r])=>r.test(text)).map(([k])=>k),
    mentionedOfficialHosts:hosts.filter(h=>text.includes('https://'+h+'/'))};
}
export function stagePostcondition(stage,code) {
  const file=rel=>{const f=path.join(code,rel);return fs.existsSync(f)&&fs.lstatSync(f).isFile()&&!fs.lstatSync(f).isSymbolicLink()&&fs.statSync(f).size>0;};
  if(stage==='repository') {
    const git=(...args)=>execFileSync('git',['-C',code,...args],{windowsHide:true,encoding:'utf8',timeout:10000,stdio:['ignore','pipe','pipe']}).trim();
    return file('pyproject.toml')&&file('hermes_cli/__init__.py')&&git('rev-parse','HEAD')===sourcePin&&git('rev-parse','HEAD^{tree}')===sourceTree;
  }
  const managed=path.join(code,'.hermes-runtime/python');
  if(stage==='python') return fs.existsSync(managed)&&fs.readdirSync(managed).some(n=>/^cpython-3\.(11|12|13)\./.test(n)&&file('.hermes-runtime/python/'+n+'/python.exe'));
  if(stage==='venv') {
    if(!file('venv/Scripts/python.exe')||!file('venv/pyvenv.cfg'))return false;
    const cfg=fs.readFileSync(path.join(code,'venv/pyvenv.cfg'),'utf8'),home=cfg.match(/^home\s*=\s*(.+)$/m)?.[1].trim();
    return !!home&&within(managed,path.resolve(home))&&/^include-system-site-packages\s*=\s*false\s*$/m.test(cfg);
  }
  if(stage==='dependencies') {
    const site=path.join(code,'venv/Lib/site-packages');if(!fs.existsSync(site)||!file('venv/Scripts/hermes.exe'))return false;
    const found=fs.readdirSync(site).filter(n=>/^hermes[_-]agent-.*\.dist-info$/i.test(n));
    if(found.length!==1)return false;
    const metadata=fs.readFileSync(path.join(site,found[0],'METADATA'),'utf8');
    const entry=fs.readFileSync(path.join(site,found[0],'entry_points.txt'),'utf8');
    return /^Version: 0\.21\.3\s*$/m.test(metadata)&&/^hermes\s*=\s*hermes_cli\.main:main\s*$/m.test(entry);
  }
  throw Error('unknown_stage');
}
export async function runDirectSequence({run,postcondition,deadline,now=Date.now,onResult=()=>{}}) {
  const results=[];
  for(const stage of stages) {
    const remaining=deadline-now();if(remaining<=0)throw Error('installation_deadline');
    const result={stage,...await run(stage,remaining),postcondition:false};
    if(result.exitCode===0&&result.cleanup===true&&result.terminationReason==='root_exit') {
      try{result.postcondition=postcondition(stage)===true;}catch{result.postcondition=false;}
    }
    results.push(result);onResult(result);
    if(!result.postcondition)throw Error('direct_stage_failed');
  }
  return results;
}
