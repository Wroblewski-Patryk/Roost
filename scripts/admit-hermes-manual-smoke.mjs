// Admit only the one manually authorized smoke; never general/managed execution.
import fs from 'node:fs';
import path from 'node:path';
import {validateManualState,assertExpectedModel} from './lib/hermes-manual-profile.mjs';
import {sha256} from './lib/hermes-manual-install.mjs';

const [stateArg,oldHash]=process.argv.slice(2),statePath=path.resolve(stateArg);
const {state}=validateManualState(statePath,oldHash);
if(state.model.status!=='pending'||state.model.admitted!==false)throw Error('pending_required');
const receipt=JSON.parse(fs.readFileSync(path.join(state.root.path,'point3-control/pull-receipt.json')));
if(receipt.result!=='PULLED'||receipt.pullAttempts!==1||receipt.pull.exitCode!==0||!receipt.pull.cleanup
   ||receipt.model.name!=='gpt-oss:20b'||receipt.freeAfterPull<6*1024**3)throw Error('pull_not_qualified');
const expected='sha256:'+receipt.registryManifestSha256;
if(receipt.model.digest.replace(/^sha256:/,'')!==receipt.registryManifestSha256)throw Error('digest_mismatch');
const response=await fetch('http://127.0.0.1:11434/api/tags',{redirect:'error',signal:AbortSignal.timeout(5000)});
if(!response.ok)throw Error('local_model_unavailable');
const tags=await response.json();assertExpectedModel(tags,expected);
if(tags.models.length!==1||tags.models[0].size!==receipt.model.size)throw Error('model_inventory');
const batchPath=path.join(state.root.path,'Launch Hermes Manual.cmd'),batch=fs.readFileSync(batchPath,'utf8');
if(batch.split(oldHash).length!==2)throw Error('launcher_state_binding');
state.status='admitted-for-manual-smoke';
Object.assign(state.model,{status:'admitted-for-manual-smoke',admitted:false,digest:expected,
  presence:'verified_local',size:receipt.model.size,admissionScope:'one-manual-no-tools-smoke',
  verifiedAt:new Date().toISOString()});
const bytes=JSON.stringify(state,null,2)+'\n',hash=sha256(bytes);
fs.writeFileSync(statePath,bytes);
fs.writeFileSync(batchPath,batch.replace(oldHash,hash));
fs.writeFileSync(path.join(state.root.path,'README.txt'),
  'Hermes manual — profil hermes-manual\r\nModel gpt-oss:20b zostal pobrany i zweryfikowany lokalnie.\r\nZakres dopuszczenia: jeden manualny test bez narzedzi (admitted-for-manual-smoke).\r\nWynik testu zapisuje MANUAL_MODEL_SMOKE_RECEIPT.json.\r\nLauncher interaktywny pozostaje zablokowany; Roost i Electron Desktop nie zostaly aktywowane.\r\nBrak fallbackow, zewnetrznych loginow i uprawnien Roost.\r\n');
validateManualState(statePath,hash);
console.log(JSON.stringify({result:'PASS',stateSha256:hash,modelStatus:state.model.status,
  modelDigest:expected,modelBytes:state.model.size,roostAuthority:false}));
