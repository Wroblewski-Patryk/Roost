// Owner-only manual profile; never imported by a Roost Worker.
import fs from 'node:fs';
import path from 'node:path';
import {inventory,assertNoOverlap,assertOwned,validateReceipt,sha256,within} from './hermes-manual-install.mjs';

export const schema='hermes-manual-profile-v1';
export const model='gpt-oss:20b';
export const endpoint='http://127.0.0.1:11434/v1';
export const config={
  model:{provider:'custom',default:model,base_url:endpoint,api_mode:'chat_completions'},
  fallback_providers:[],fallback_model:[],providers:{},custom_providers:[],
  toolsets:[],platform_toolsets:{cli:[],tui:[],desktop:[]},
  agent:{coding_context:'off',disabled_toolsets:[]},
  auth:{adopt_external_logins:false},compression:{enabled:false},
  auxiliary:{title_generation:{enabled:false,model_upgrade_enabled:false},background_review:{enabled:false}},
  memory:{memory_enabled:false,user_profile_enabled:false,provider:''},
  skills:{external_dirs:[],project_discovery:false,trusted_project_dirs:[],auto_load:[],inline_shell:false},
  plugins:{enabled:[]},mcp_servers:{},hooks:{},hooks_auto_accept:false,
  smart_model_routing:{enabled:false},checkpoints:{enabled:false},
  updates:{check:false},lsp:{enabled:false},desktop:{repo_scan_enabled:false},
  display:{interface:'cli',resume_last_session:false},
};
export const configBytes=()=>Buffer.from(JSON.stringify(config,null,2)+'\n');
export function fileIdentity(file){
  const s=fs.lstatSync(file,{bigint:true});
  if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1n||fs.realpathSync.native(file)!==path.resolve(file))throw Error('file_identity');
  return {path:file,fileId:`${s.dev}:${s.ino}`,sha256:sha256(fs.readFileSync(file))};
}
export function checkFile(expected){
  const actual=fileIdentity(expected.path);
  if(actual.fileId!==expected.fileId||actual.sha256!==expected.sha256)throw Error('file_drift');
}
export function readInstallation(receiptPath,expectedHash){
  const bytes=fs.readFileSync(receiptPath);
  if(sha256(bytes)!==expectedHash)throw Error('installation_receipt_drift');
  const receipt=JSON.parse(bytes);
  if(receipt.root!==path.join(path.dirname(receiptPath),'runtime')||receipt.executable!==path.join(receipt.root,'venv/Scripts/hermes.exe')
      ||receipt.interpreter!==path.join(receipt.root,'venv/Scripts/python.exe')||!receipt.versionSmoke?.cleanup)throw Error('installation_receipt_shape');
  assertOwned(receipt.root,String(fs.statSync(receipt.root,{bigint:true}).ino));
  const current=inventory(receipt.root,{allowInternalLinks:true});validateReceipt(receipt,current);
  return {receipt,current};
}
export function manualEnvironment(state){
  // Construct, never inherit. In particular no Roost, OAuth, API keys, proxy,
  // Python/Node import overrides, inherited profile selectors or repo cwd.
  const system=path.join(state.systemRoot,'System32'),home=state.home.path;
  return {SystemRoot:state.systemRoot,WINDIR:state.systemRoot,OS:'Windows_NT',
    COMSPEC:path.join(system,'cmd.exe'),PATH:[path.dirname(state.runtime.executable),system].join(';'),PATHEXT:'.EXE',
    HOME:home,USERPROFILE:home,HOMEDRIVE:path.parse(home).root.slice(0,2),HOMEPATH:home.slice(2),
    LOCALAPPDATA:path.join(state.root.path,'local'),APPDATA:path.join(state.root.path,'roaming'),
    TEMP:path.join(state.root.path,'temp'),TMP:path.join(state.root.path,'temp'),HERMES_HOME:home,
    HERMES_DESKTOP_USER_DATA_DIR:state.desktopState.path,HERMES_INFERENCE_PROVIDER:'custom',
    HERMES_IGNORE_RULES:'1',HERMES_ENABLE_PROJECT_PLUGINS:'0',HERMES_DISABLE_LAZY_INSTALLS:'1',
    HERMES_TUI_NO_EARLY_DISABLE:'1',PYTHONDONTWRITEBYTECODE:'1',PYTHONNOUSERSITE:'1',PYTHONUTF8:'1',
    GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:path.join(state.root.path,'empty.gitconfig'),
    GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'};
}
export function validateManualState(statePath,expectedHash){
  const bytes=fs.readFileSync(statePath);if(sha256(bytes)!==expectedHash)throw Error('manual_receipt_drift');
  const state=JSON.parse(bytes);
  if(state.schema!==schema||state.profile!=='hermes-manual'||state.roostAuthority!==false
      ||state.model.name!==model||state.model.endpoint!==endpoint)throw Error('manual_state_shape');
  if(statePath!==path.join(state.root.path,'MANUAL_DESKTOP_STATE.json'))throw Error('manual_state_location');
  for(const dir of [state.root,state.home,state.desktopState])assertOwned(dir.path,dir.identity);
  if(state.home.path!==path.join(state.root.path,'hermes-manual')||state.desktopState.path!==path.join(state.root.path,'desktop-state'))throw Error('profile_location');
  for(const denied of [...state.protectedRoots,state.runtime.root])
    if(within(denied,state.root.path)||within(state.root.path,denied))throw Error('profile_path_overlap');
  checkFile(state.node);if(fs.realpathSync.native(process.execPath)!==state.node.path)throw Error('launcher_node_drift');
  for(const file of state.bundle)checkFile(file);
  if(!fs.readFileSync(path.join(state.home.path,'config.yaml')).equals(configBytes()))throw Error('manual_config_drift');
  // Credentials, hooks, MCP definitions and active-profile selectors may not be
  // added behind this pending profile's fixed launcher contract.
  for(const name of ['.env','auth.json','active_profile','profiles','mcp.json'])
    if(fs.existsSync(path.join(state.home.path,name)))throw Error('unexpected_profile_input');
  // initialize_home creates an empty hooks directory even for --version.
  for(const name of ['hooks','plugins']){
    const dir=path.join(state.home.path,name);
    if(fs.existsSync(dir)&&(!fs.lstatSync(dir).isDirectory()||fs.lstatSync(dir).isSymbolicLink()||fs.readdirSync(dir).length))throw Error('unexpected_profile_input');
  }
  const installation=readInstallation(state.runtime.receipt,state.runtime.receiptSha256);
  if(state.runtime.root!==installation.receipt.root||state.runtime.executable!==installation.receipt.executable)throw Error('runtime_binding');
  const protectedTrees=state.protectedRoots.map(p=>inventory(p,{hashes:false}));
  const profileTree=inventory(state.root.path);
  assertNoOverlap(profileTree,[...protectedTrees,installation.current]);
  assertNoOverlap(installation.current,protectedTrees);
  return {state,profileTree};
}
export function requireModelAdmission(state){
  if(state.model.status!=='admitted'||state.model.admitted!==true||!/^sha256:[a-f0-9]{64}$/.test(state.model.digest??''))
    throw Error('model_pending_point_3');
}
export function assertExpectedModel(tags,expectedDigest){
  const matches=Array.isArray(tags?.models)?tags.models.filter(m=>m.name===model):[];
  const normalize=value=>typeof value==='string'&&/^(?:sha256:)?[a-f0-9]{64}$/.test(value)?value.replace(/^sha256:/,''):null;
  if(matches.length!==1||!normalize(expectedDigest)||normalize(matches[0].digest)!==normalize(expectedDigest))throw Error('expected_model_missing_or_changed');
}
