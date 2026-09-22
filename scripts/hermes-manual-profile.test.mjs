import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {sourcePin,installerHash,inventory,sha256} from './lib/hermes-manual-install.mjs';
import {schema,configBytes,config,endpoint,model,fileIdentity,manualEnvironment,validateManualState,requireModelAdmission,assertExpectedModel} from './lib/hermes-manual-profile.mjs';

test('pending and incomplete admissions refuse; model inventory cannot substitute another model/digest',()=>{
  for(const m of [{status:'pending',admitted:false},{status:'admitted',admitted:false},{status:'admitted',admitted:true}])assert.throws(()=>requireModelAdmission({model:m}),/model_pending/);
  const digest='sha256:'+'a'.repeat(64);requireModelAdmission({model:{status:'admitted',admitted:true,digest}});
  assertExpectedModel({models:[{name:model,digest}]},digest);
  assertExpectedModel({models:[{name:model,digest:digest.slice(7)}]},digest);
  for(const tags of [{},{models:[]},{models:[{name:'other',digest}]},{models:[{name:model,digest:'wrong'}]},
    {models:[{name:model,digest},{name:model,digest}]}])assert.throws(()=>assertExpectedModel(tags,digest));
});
test('manual environment never inherits provider credentials, proxies, repo authority or import hooks',()=>{
  const home=path.join(os.tmpdir(),'example-manual');
  const env=manualEnvironment({systemRoot:process.env.SystemRoot??'/system',root:{path:home},home:{path:path.join(home,'hermes-manual')},
    desktopState:{path:path.join(home,'desktop-state')},runtime:{executable:path.join(home,'runtime/venv/Scripts/hermes.exe')}});
  for(const key of ['OPENAI_API_KEY','ANTHROPIC_API_KEY','HTTP_PROXY','HTTPS_PROXY','ROOST_API_KEY','CODEX_HOME','HERMES_MANAGED_CONFIG','PYTHONPATH','NODE_OPTIONS'])assert.equal(env[key],undefined);
  assert.equal(env.HERMES_HOME,path.join(home,'hermes-manual'));assert.equal(env.HERMES_IGNORE_RULES,'1');
  assert.deepEqual(config.platform_toolsets.cli,[]);assert.equal(config.auth.adopt_external_logins,false);
});
test('offline launcher verifies fixed state/runtime and refuses pending without executing a fake Hermes',()=>{
  const base=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'manual-profile-test-'));
  try{
    const root=path.join(base,'manual'),runtime=path.join(base,'runtime'),protectedRoot=path.join(base,'protected');
    for(const p of [root,runtime,protectedRoot,path.join(runtime,'venv'),path.join(runtime,'venv/Scripts'),path.join(root,'hermes-manual'),path.join(root,'desktop-state')])fs.mkdirSync(p);
    fs.writeFileSync(path.join(runtime,'venv/Scripts/hermes.exe'),'must never execute');fs.writeFileSync(path.join(runtime,'venv/Scripts/python.exe'),'fixture');
    fs.writeFileSync(path.join(protectedRoot,'data'),'protected');fs.writeFileSync(path.join(root,'hermes-manual/config.yaml'),configBytes());
    const receiptPath=path.join(base,'installation-receipt.json');const inv=inventory(runtime);
    const receipt={schemaVersion:'hermes-manual-install-v1',sourcePin,version:'0.21.3',installerSha256:installerHash,inventoryDigest:inv.digest,profileCreated:false,
      root:runtime,executable:path.join(runtime,'venv/Scripts/hermes.exe'),interpreter:path.join(runtime,'venv/Scripts/python.exe'),versionSmoke:{cleanup:true}};
    fs.writeFileSync(receiptPath,JSON.stringify(receipt));
    const dir=p=>({path:p,identity:String(fs.statSync(p,{bigint:true}).ino)});
    const state={schema,profile:'hermes-manual',roostAuthority:false,root:dir(root),home:dir(path.join(root,'hermes-manual')),desktopState:dir(path.join(root,'desktop-state')),
      model:{name:model,endpoint,status:'pending',admitted:false},runtime:{...receipt,receipt:receiptPath,receiptSha256:sha256(fs.readFileSync(receiptPath))},
      protectedRoots:[protectedRoot],node:fileIdentity(fs.realpathSync.native(process.execPath)),bundle:[]};
    const statePath=path.join(root,'MANUAL_DESKTOP_STATE.json');fs.writeFileSync(statePath,JSON.stringify(state));const hash=sha256(fs.readFileSync(statePath));
    const launcher=fileURLToPath(new URL('./hermes-manual-launcher.mjs',import.meta.url));
    const checked=spawnSync(process.execPath,[launcher,statePath,hash,'--check'],{encoding:'utf8',timeout:15000});
    assert.equal(checked.status,0,checked.stderr);assert.equal(JSON.parse(checked.stdout).networkRequests,0);
    const pending=spawnSync(process.execPath,[launcher,statePath,hash],{encoding:'utf8',timeout:15000});
    assert.equal(pending.status,3);assert.match(pending.stderr,/PUNKT 3/);
    const cfg=path.join(root,'hermes-manual/config.yaml');
    fs.writeFileSync(cfg,JSON.stringify({...config,model:{provider:'openai'}}));
    assert.throws(()=>validateManualState(statePath,hash),/manual_config_drift/);fs.writeFileSync(cfg,configBytes());
    const auth=path.join(root,'hermes-manual/auth.json');fs.writeFileSync(auth,'{}');
    assert.throws(()=>validateManualState(statePath,hash),/unexpected_profile_input/);fs.unlinkSync(auth);
    const hooks=path.join(root,'hermes-manual/hooks');fs.mkdirSync(hooks);validateManualState(statePath,hash);
    fs.writeFileSync(path.join(hooks,'unexpected.py'),'not allowed');
    assert.throws(()=>validateManualState(statePath,hash),/unexpected_profile_input/);fs.unlinkSync(path.join(hooks,'unexpected.py'));
    const overlap=path.join(root,'hermes-manual/shared');fs.linkSync(path.join(protectedRoot,'data'),overlap);
    assert.throws(()=>validateManualState(statePath,hash),/physical_overlap/);fs.unlinkSync(overlap);
    fs.writeFileSync(path.join(runtime,'venv/Scripts/hermes.exe'),'changed');
    assert.throws(()=>validateManualState(statePath,hash),/manual_runtime_drift/);
  }finally{fs.rmSync(base,{recursive:true});}
});
